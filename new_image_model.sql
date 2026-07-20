-- 1. Grok Imagine Image Editing Quality (image-to-image)
-- 720p: $0.05 / 1080p: $0.07 / 2160p: 미지원 / input_image: $0.01
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('xai/grok-imagine-image/quality/edit', 'fal.ai', 'Grok Imagine Image Editing Quality', 'Grok Imagine Pro is an advanced AI model from xAI that creates high-quality visuals from text prompts and allows you to edit or analyze existing images.', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0a959abd/vUggNVIfKJsfVCUQhcI7s_ea5f9f2ac49147d49270324989db60e4.jpg', 'https://fal.run/xai/grok-imagine-image/quality/edit', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.05},{"unit":"image_1080p","price_per_unit":0.07},{"unit":"input_image","price_per_unit":0.01}]'::jsonb);

-- 2. Grok Imagine Image (text-to-image)
-- 720p: $0.05 / 1080p: $0.07 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('xai/grok-imagine-image/quality/text-to-image', 'fal.ai', 'Grok Imagine Image', 'Grok Imagine Pro is an advanced AI model from xAI that creates high-quality visuals from text prompts and allows you to edit or analyze existing images.', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0a959ac2/BbRJ1XroSH1gwHzPYc_t8_8ba16f7ab525499aaa149fba1039b4a4.jpg', 'https://fal.run/xai/grok-imagine-image/quality/text-to-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.05},{"unit":"image_1080p","price_per_unit":0.07}]'::jsonb);

-- 3. Hidream O1 Image (image-to-image)
-- 720p: $0.0092 / 1080p: $0.0207 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('fal-ai/hidream-o1-image/edit', 'fal.ai', 'Hidream O1 Image', 'Unified image generation with HiDream-O1-Image. Create, edit, and personalize high-resolution images up to 2K—single native model handles text-to-image, editing, and custom subjects without external components.', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0a99921e/VChBoBpjrCe5lbXHv97mB_220119a1d12448c2bb216d8e8ec6245e.jpg', 'https://fal.run/fal-ai/hidream-o1-image/edit', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0092},{"unit":"image_1080p","price_per_unit":0.0207}]'::jsonb);

-- 4. Hidream O1 Image (text-to-image)
-- 720p: $0.0092 / 1080p: $0.0207 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('fal-ai/hidream-o1-image', 'fal.ai', 'Hidream O1 Image', 'Unified image generation with HiDream-O1-Image. Create, edit, and personalize high-resolution images up to 2K—single native model handles text-to-image, editing, and custom subjects without external components.', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0a999217/79hRTD17Is8llel4R5GvK_fb7bcffb53ea405198c7978f9886a668.jpg', 'https://fal.run/fal-ai/hidream-o1-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0092},{"unit":"image_1080p","price_per_unit":0.0207}]'::jsonb);

-- 5. Hidream O1 Image Dev (image-to-image)
-- 720p: $0.0046 / 1080p: $0.01035 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('fal-ai/hidream-o1-image/dev/edit', 'fal.ai', 'Hidream O1 Image', 'Unified image generation with HiDream-O1-Image. Create, edit, and personalize high-resolution images up to 2K—single native model handles text-to-image, editing, and custom subjects without external components.', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0a999225/QmwooLH3hpHa3255JhRoC_d6e5053b73d44e4a9b4593a043360e66.jpg', 'https://fal.run/fal-ai/hidream-o1-image/dev/edit', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0046},{"unit":"image_1080p","price_per_unit":0.01035}]'::jsonb);

-- 6. Hidream O1 Image Dev (text-to-image)
-- 720p: $0.0046 / 1080p: $0.01035 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('fal-ai/hidream-o1-image/dev', 'fal.ai', 'Hidream O1 Image', 'Unified image generation with HiDream-O1-Image. Create, edit, and personalize high-resolution images up to 2K—single native model handles text-to-image, editing, and custom subjects without external components.', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0a9991f9/vvcIi5jpPDoJJ_j-Mqjet_714dcf611a2d446381e3b2a8eb084c21.jpg', 'https://fal.run/fal-ai/hidream-o1-image/dev', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0046},{"unit":"image_1080p","price_per_unit":0.01035}]'::jsonb);

-- 7. Imagineart 2.0 Edit Preview (image-to-image)
-- 720p: $0.05 / 1080p: $0.05 / 2160p: 미지원 / input_image_above_1: $0.007
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('imagineart/imagineart-2.0-edit-preview/image-to-image', 'fal.ai', 'Imagineart 2.0 Edit Preview', 'ImagineArt 2.0 Edit delivers precise prompt-guided image editing at 2K resolution, preserving fine detail and realism while accurately applying targeted changes across one or more reference images.', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0a9ad814/PsE01Pyi5i4PgVaJ7qytu_4e417585f9e74974afdf1362d3ec7443.jpg', 'https://fal.run/imagineart/imagineart-2.0-edit-preview/image-to-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.05},{"unit":"image_1080p","price_per_unit":0.05},{"unit":"input_image_above_1","price_per_unit":0.007}]'::jsonb);

-- 8. Imagineart 2.0 Preview (text-to-image)
-- 720p: $0.03 / 1080p: $0.05 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('imagineart/imagineart-2.0-preview/text-to-image', 'fal.ai', 'Imagineart 2.0 Preview', 'ImagineArt 2.0 is ImagineArt''s latest state-of-the-art visual reasoning text-to-image model, generating high-fidelity, professional-grade visuals with lifelike realism, cinematic effects, and strong aesthetic quality.', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0a9619d4/8isHEzPc3fcKe_uRplQCZ_0270eeb6dceb461c97fe89581ef257f7.jpg', 'https://fal.run/imagineart/imagineart-2.0-preview/text-to-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.03},{"unit":"image_1080p","price_per_unit":0.05}]'::jsonb);

-- 9. Ideogram V4.0q Image to Image (image-to-image)
-- 720p: $0.023 / 1080p: $0.05175 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('ideogram/v4/image-to-image', 'fal.ai', 'Ideogram V4.0q Image to Image', 'Ideogram V4.0q Image-to-Image transforms an input image with a text prompt, restyling and reworking the composition while preserving its core structure for prompt-faithful, high-fidelity edits.', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0a9dc0d8/Sk7dDmlNxtuNqrIC5PGqo_cb68a0ee29c44a729d67bd251546ba63.jpg', 'https://fal.run/ideogram/v4/image-to-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.023},{"unit":"image_1080p","price_per_unit":0.05175}]'::jsonb);

-- 10. Ideogram V4.0 Text to Image (text-to-image)
-- 720p: $0.023 / 1080p: $0.05175 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('ideogram/v4', 'fal.ai', 'Ideogram V4.0 Text to Image', 'Generate high-quality images, posters, and logos with Ideogram''s latest V4.0q — producing crisp visuals with accurate text rendering, fine detail, and full creative control for polished, ready-to-use designs.', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0a9cb567/UOWMMlOcuBA-NRLAWnP2G_8e662a91cf494675a0f6a83852cdb6e1.jpg', 'https://fal.run/ideogram/v4', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.023},{"unit":"image_1080p","price_per_unit":0.05175}]'::jsonb);

-- 11. Boogu Image (image-to-image)
-- 720p: $0.0368 / 1080p: $0.0828 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('fal-ai/boogu-image/edit', 'fal.ai', 'Boogu Image', 'Image Editing using Boogu-Image', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0a9eb89f/j82hUH1BOPbfNF6F0etgy_2e7f4e89b0314bc997a85a38dd833d2b.jpg', 'https://fal.run/fal-ai/boogu-image/edit', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0368},{"unit":"image_1080p","price_per_unit":0.0828}]'::jsonb);

-- 12. Boogu Image (text-to-image)
-- 720p: $0.0368 / 1080p: $0.0828 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('fal-ai/boogu-image', 'fal.ai', 'Boogu Image', 'Text To Image Model using Boogu-Image', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0a9eb742/8QNsn7JFWdvxtbkhJsDym_1e782ca20ecb4a9187294c4d2e1140d6.jpg', 'https://fal.run/fal-ai/boogu-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0368},{"unit":"image_1080p","price_per_unit":0.0828}]'::jsonb);

-- 13. Seedream 5.0 Pro Image Editing (image-to-image)
-- 720p: $0.0675 / 1080p: $0.0675 / 2160p: 미지원 / input_image_above_1: $0.0045
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('bytedance/seedream/v5/pro/edit', 'fal.ai', 'Seedream 5.0 Pro Image Editing', 'Seedream 5.0 Pro is grounded, region-precise image editing model that changes one element while keeping the rest of the frame intact with layer separation, sketch completion, and up to 10 reference images.', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0aa15606/l4xYHHjF6aMrdoonScgXK.jpg', 'https://fal.run/bytedance/seedream/v5/pro/edit', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0675},{"unit":"image_1080p","price_per_unit":0.0675},{"unit":"input_image_above_1","price_per_unit":0.0045}]'::jsonb);

-- 14. Seedream 5.0 Pro Text to Image (text-to-image)
-- 720p: $0.0675 / 1080p: $0.0675 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('bytedance/seedream/v5/pro/text-to-image', 'fal.ai', 'Seedream 5.0 Pro Text to Image', 'ByteDance''s Seedream 5.0 Pro is flagship text-to-image model, with deep-thinking prompt understanding, native text in 14 languages, and precise control over dense layouts and structured designs.', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0aa1561a/Rb0DDLUI2sx4gevoh1HKt.jpg', 'https://fal.run/bytedance/seedream/v5/pro/text-to-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.0675},{"unit":"image_1080p","price_per_unit":0.0675}]'::jsonb);

-- 15. Seedream Lite (image-to-image)
-- 720p: $0.035 / 1080p: $0.035 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('bytedance/seedream/v5/lite/edit', 'fal.ai', 'Seedream', 'Image editing endpoint for the fast Lite version of Seedream 5.0, supporting high quality intelligent image editing with multiple inputs.', 'image-to-image', 'active', 'https://v3b.fal.media/files/b/0a9c2fb5/PIUPm_8kBdpdBoSkOebbz_bcfdbe1021324995bf3c36b05ab59c2c.jpg', 'https://fal.run/bytedance/seedream/v5/lite/edit', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.035},{"unit":"image_1080p","price_per_unit":0.035}]'::jsonb);

-- 16. Seedream Lite (text-to-image)
-- 720p: $0.035 / 1080p: $0.035 / 2160p: 미지원
INSERT INTO ai_model_data (endpoint_id, provider, display_name, description, category, status, thumbnail_url, model_url, supported_duration_range, ai_model_price_list) 
VALUES ('bytedance/seedream/v5/lite/text-to-image', 'fal.ai', 'Seedream', 'Text to Image endpoint for the fast Lite version of Seedream 5.0, supporting high quality intelligent text-to-image generation.', 'text-to-image', 'active', 'https://v3b.fal.media/files/b/0a8f9a87/jRElAKkVlihQHtusciuoI_b73a05e10c45441bb15bce9cbed1bf25.jpg', 'https://fal.run/bytedance/seedream/v5/lite/text-to-image', ARRAY[]::numeric[], '[{"unit":"image_720p","price_per_unit":0.035},{"unit":"image_1080p","price_per_unit":0.035}]'::jsonb);