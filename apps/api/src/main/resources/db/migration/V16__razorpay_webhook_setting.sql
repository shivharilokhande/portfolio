-- Register the Razorpay webhook secret in the admin-editable settings table.
-- The buyer copies the secret from Razorpay Dashboard → Settings → Webhooks
-- into /admin/settings → Payment → Razorpay webhook secret.
--
-- Idempotent: only inserts when the key isn't already registered.

INSERT INTO app_setting (setting_key, category, label, description, is_secret)
SELECT 'payment.razorpay.webhookSecret', 'payment',
       'Razorpay webhook secret',
       'Signing secret from Razorpay Dashboard > Settings > Webhooks. Used to verify inbound events.',
       TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM app_setting WHERE setting_key = 'payment.razorpay.webhookSecret'
);
