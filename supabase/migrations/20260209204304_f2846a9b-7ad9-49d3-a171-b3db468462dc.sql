
-- Insert product identity settings into platform_settings
INSERT INTO public.platform_settings (key, value, category, label, description, is_secret)
VALUES
  ('company_website_url', '', 'product_identity', 'Company Website (Optional)', 'Optional: Enter your website URL to auto-extract product information', false),
  ('product_name', '', 'product_identity', 'Product Name', 'The name of your product or service', false),
  ('target_audience', '', 'product_identity', 'Target Audience', 'Who is your ideal customer? Describe your target market.', false),
  ('what_we_do', '', 'product_identity', 'What We Do', 'Describe what your product/service does in detail.', false),
  ('core_value_proposition', '', 'product_identity', 'Core Value Proposition', 'What makes your offering unique? Why should customers choose you?', false),
  ('key_features', '', 'product_identity', 'Key Features', 'List the key features of your product/service (one per line).', false),
  ('tone_voice_guidelines', '', 'product_identity', 'Tone & Voice Guidelines', 'Describe the tone and voice for AI-generated content.', false)
ON CONFLICT (key) DO NOTHING;
