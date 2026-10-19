from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class AccountTests(APITestCase):
    def register(self):
        return self.client.post('/api/auth/register/', {
            'hometown': 'Brooklyn, NY', 'name': 'trail_fox42', 'email': 'Traveler@example.com',
            'password': 'A-long-random-passphrase-92!',
        })

    def test_account_lifecycle(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        user = get_user_model().objects.get(email='traveler@example.com')
        self.assertTrue(user.check_password('A-long-random-passphrase-92!'))
        self.assertFalse(user.is_staff)
        self.assertEqual(response.data['user']['name'], 'trail_fox42')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        login = self.client.post('/api/auth/sign-in/', {
            'email': 'TRAVELER@example.com', 'password': 'A-long-random-passphrase-92!',
        })
        self.assertEqual(login.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login.data['access'])
        self.assertEqual(self.client.get('/api/auth/me/').data['id'], user.pk)
        updated = self.client.patch('/api/auth/me/', {'name': 'New name', 'is_staff': True})
        self.assertEqual(updated.data['name'], 'New name')
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.client.credentials()
        refresh = login.data['refresh']
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': refresh}).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/sign-out/', {'refresh': refresh}).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': refresh}).status_code, 401)

    def test_rejects_duplicate_weak_password_and_bad_login(self):
        self.assertEqual(self.register().status_code, 201)
        self.assertEqual(self.register().status_code, 400)
        weak = self.client.post('/api/auth/register/', {
            'name': 'Other', 'email': 'other@example.com', 'password': '123',
        })
        self.assertEqual(weak.status_code, 400)
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertEqual(self.client.post('/api/auth/sign-in/', {
            'email': 'traveler@example.com', 'password': 'incorrect',
        }).status_code, 401)

from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from .models import SocialAttempt, SocialIdentity
from .social import verify_identity


class SocialTests(APITestCase):
    def start(self):
        return self.client.post('/api/auth/social/google/start/')

    @patch.dict('os.environ', {'GOOGLE_CLIENT_ID': 'test-client', 'GOOGLE_CLIENT_SECRET': 'secret', 'GOOGLE_REDIRECT_URI': 'https://example.com/api/auth/social/google/callback/'})
    @patch('api.social.verify_identity')
    def test_social_onboarding_and_single_use(self, verify):
        verify.return_value = {'sub': 'provider-user', 'email': 'social@example.com', 'email_verified': True, 'name': 'Social User'}
        start = self.start()
        self.assertEqual(start.status_code, 200)
        attempt = SocialAttempt.objects.get()
        self.assertEqual(self.client.post('/api/auth/social/result/', {'secret': start.data['secret']}).data, {'pending': True})
        callback = '/api/auth/social/google/callback/'
        self.assertEqual(self.client.get(callback, {'state': attempt.state, 'code': 'code'}).status_code, 200)
        self.assertEqual(self.client.get(callback, {'state': attempt.state, 'code': 'code'}).status_code, 400)
        result = self.client.post('/api/auth/social/result/', {'secret': start.data['secret']})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data['user']['hometown'], '')
        self.assertEqual(result.data['user']['name'], '')
        self.assertFalse(SocialIdentity.objects.get().user.has_usable_password())
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + result.data['access'])
        updated = self.client.patch('/api/auth/me/', {'name': 'city_wanderer', 'hometown': 'Queens, NY'})
        self.assertEqual(updated.data['hometown'], 'Queens, NY')
        self.assertEqual(self.client.get('/api/auth/me/').data['hometown'], 'Queens, NY')
        self.assertEqual(self.client.patch('/api/auth/me/', {'hometown': '  '}).status_code, 400)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/auth/social/result/', {'secret': start.data['secret']}).status_code, 400)
        second = self.start()
        attempt = SocialAttempt.objects.get()
        self.client.get(callback, {'state': attempt.state, 'code': 'next'})
        result = self.client.post('/api/auth/social/result/', {'secret': second.data['secret']})
        self.assertEqual(result.data['user']['hometown'], 'Queens, NY')
        self.assertEqual(result.data['user']['name'], 'city_wanderer')
        self.assertEqual(SocialIdentity.objects.count(), 1)

    @patch.dict('os.environ', {'GOOGLE_CLIENT_ID': 'test-client', 'GOOGLE_CLIENT_SECRET': 'secret', 'GOOGLE_REDIRECT_URI': 'https://example.com/callback'})
    @patch('api.social.verify_identity')
    def test_no_automatic_email_linking_and_expiry(self, verify):
        get_user_model().objects.create_user(username='existing', email='existing@example.com', password='secret')
        verify.return_value = {'sub': 'new-sub', 'email': 'existing@example.com', 'email_verified': True}
        start = self.start()
        attempt = SocialAttempt.objects.get()
        self.client.get('/api/auth/social/google/callback/', {'state': attempt.state, 'code': 'code'})
        result = self.client.post('/api/auth/social/result/', {'secret': start.data['secret']})
        self.assertEqual(result.status_code, 400)
        self.assertEqual(SocialIdentity.objects.count(), 0)
        start = self.start()
        SocialAttempt.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.client.post('/api/auth/social/result/', {'secret': start.data['secret']}).status_code, 400)

    @patch.dict('os.environ', {'APPLE_CLIENT_ID': '', 'GOOGLE_CLIENT_ID': ''})
    def test_unconfigured_provider(self):
        self.assertEqual(self.start().status_code, 503)
        self.assertEqual(self.client.post('/api/auth/social/apple/start/').status_code, 503)
        self.assertEqual(self.client.get('/api/auth/social/google/callback/', {'state': 'invalid'}).status_code, 400)

class IdentityVerificationTests(APITestCase):
    @patch.dict('os.environ', {'GOOGLE_CLIENT_ID': 'expected-client', 'GOOGLE_CLIENT_SECRET': 'secret', 'GOOGLE_REDIRECT_URI': 'https://example.com/callback'})
    def test_signature_audience_expiration_and_nonce(self):
        import io
        import json
        import jwt
        from cryptography.hazmat.primitives.asymmetric import rsa
        from types import SimpleNamespace
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        now = int(timezone.now().timestamp())
        valid = dict(sub='subject', iss='https://accounts.google.com', aud='expected-client',
                     iat=now, exp=now + 300, nonce='expected-nonce', email='test@example.com', email_verified=True)
        for changes, nonce, succeeds in [({}, 'expected-nonce', True), ({'aud': 'wrong-client'}, 'expected-nonce', False),
                                         ({'exp': now - 60}, 'expected-nonce', False), ({}, 'wrong-nonce', False),
                                         ({'iss': 'https://attacker.example'}, 'expected-nonce', False)]:
            token = jwt.encode({**valid, **changes}, private_key, algorithm='RS256')
            with patch('api.social.urlopen', return_value=io.BytesIO(json.dumps({'id_token': token}).encode())), patch('api.social.jwt.PyJWKClient') as jwks:
                jwks.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(key=private_key.public_key())
                if succeeds:
                    self.assertEqual(verify_identity('google', 'code', nonce)['sub'], 'subject')
                else:
                    with self.assertRaises((ValueError, jwt.PyJWTError)):
                        verify_identity('google', 'code', nonce)
