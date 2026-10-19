import hashlib
import json
import os
import secrets
from datetime import timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError

import jwt
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.response import Response
from .models import SocialAttempt, SocialIdentity
from .views import PublicAuthView, session

PROVIDERS = {
    'google': ('https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v3/certs', ['https://accounts.google.com', 'accounts.google.com']),
    'apple': ('https://appleid.apple.com/auth/authorize', 'https://appleid.apple.com/auth/token', 'https://appleid.apple.com/auth/keys', ['https://appleid.apple.com']),
}


def configuration(provider):
    if provider not in PROVIDERS:
        return None
    values = [os.environ.get(f'{provider.upper()}_{key}', '') for key in ('CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI')]
    return values if all(values) else None


class SocialStartView(PublicAuthView):
    def post(self, request, provider):
        config = configuration(provider)
        if not config:
            return Response({'detail': f'{provider.title()} sign-in is not configured yet. Please use email.'}, status=503)
        secret = secrets.token_urlsafe(32)
        attempt = SocialAttempt.objects.create(state=secrets.token_urlsafe(32), nonce=secrets.token_urlsafe(32),
            secret_hash=hashlib.sha256(secret.encode()).hexdigest(), provider=provider,
            expires_at=timezone.now() + timedelta(minutes=5))
        params = dict(client_id=config[0], redirect_uri=config[2], response_type='code',
            scope='openid email' if provider == 'google' else 'email', state=attempt.state, nonce=attempt.nonce)
        if provider == 'apple':
            params['response_mode'] = 'form_post'
        return Response({'url': PROVIDERS[provider][0] + '?' + urlencode(params), 'secret': secret})


def verify_identity(provider, code, nonce):
    client_id, client_secret, redirect_uri = configuration(provider)
    _, endpoint, keys, issuers = PROVIDERS[provider]
    body = urlencode(dict(client_id=client_id, client_secret=client_secret, redirect_uri=redirect_uri,
                          code=code, grant_type='authorization_code')).encode()
    with urlopen(Request(endpoint, data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'}), timeout=15) as response:
        token = json.load(response)['id_token']
    key = jwt.PyJWKClient(keys, timeout=15).get_signing_key_from_jwt(token).key
    claims = jwt.decode(token, key, algorithms=['RS256'], audience=client_id, issuer=issuers,
                        options={'require': ['exp', 'iat', 'sub', 'iss', 'aud', 'nonce']})
    if not secrets.compare_digest(claims['nonce'], nonce):
        raise ValueError('Invalid nonce')
    return claims


class SocialCallbackView(PublicAuthView):
    # Provider callbacks carry a single-use state, including Apple's cross-site POST.
    def get(self, request, provider):
        return self.finish(request.query_params, provider)

    def post(self, request, provider):
        return self.finish(request.data, provider)

    def finish(self, data, provider):
        attempt = SocialAttempt.objects.filter(state=data.get('state', ''), provider=provider,
                                              expires_at__gt=timezone.now(), claimed=False).first()
        if not attempt or not SocialAttempt.objects.filter(pk=attempt.pk, claimed=False).update(claimed=True):
            return HttpResponse('This sign-in has expired. Return to PTP and try again.', status=400)
        try:
            if data.get('error') or not data.get('code'):
                raise ValueError('Canceled')
            claims = verify_identity(provider, data['code'], attempt.nonce)
            with transaction.atomic():
                identity = SocialIdentity.objects.filter(provider=provider, subject=claims['sub']).select_related('user').first()
                if identity:
                    user = identity.user
                else:
                    email = claims.get('email', '').lower()
                    if not email or claims.get('email_verified') not in (True, 'true'):
                        raise ValueError('Unverified email')
                    User = get_user_model()
                    if User.objects.filter(email__iexact=email).exists():
                        attempt.error = 'This email already has an account. Use your original sign-in method.'
                        raise ValueError('Existing account')
                    user = User.objects.create_user(username='social_' + secrets.token_hex(24), email=email,
                                                    password=None)
                    SocialIdentity.objects.create(user=user, provider=provider, subject=claims['sub'])
                if not user.is_active:
                    raise ValueError('Inactive user')
                attempt.user = user
        except (ValueError, KeyError, TypeError, jwt.PyJWTError, URLError, TimeoutError, IntegrityError):
            attempt.error = attempt.error or 'Sign-in was canceled or could not be verified. Please try again.'
        attempt.save(update_fields=['user', 'error'])
        response = HttpResponse('<!doctype html><meta name="viewport" content="width=device-width"><title>PTP sign-in</title><h1>Return to PTP</h1><p>You can close this window and return to the app to continue.</p>')
        response['Cache-Control'] = 'no-store'
        response['Referrer-Policy'] = 'no-referrer'
        return response


class SocialResultView(PublicAuthView):
    throttle_classes = []  # Unguessable secret; polling must not consume the login throttle.

    def post(self, request):
        secret = request.data.get('secret', '')
        if not isinstance(secret, str) or not 40 <= len(secret) <= 100:
            return Response({'detail': 'Invalid sign-in request.'}, status=400)
        with transaction.atomic():
            attempt = SocialAttempt.objects.select_for_update().filter(
                secret_hash=hashlib.sha256(secret.encode()).hexdigest(), expires_at__gt=timezone.now()).first()
            if not attempt:
                return Response({'detail': 'Sign-in expired. Please try again.'}, status=400)
            if attempt.error:
                message = attempt.error
                attempt.delete()
                return Response({'detail': message}, status=400)
            if not attempt.user_id:
                return Response({'pending': True})
            user = attempt.user
            attempt.delete()
            if not user.is_active:
                return Response({'detail': 'Account unavailable.'}, status=401)
            return Response(session(user))
