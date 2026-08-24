// ad 하위 기준
//
// 1. image/route.ts (app/api/video/route.ts 처럼 넘겨주는 역할)
// 2. creative/[creative-index]/prompt/route.ts (POST, OpenRouter로 LLM 호출)
// 3. image/generation/route.ts (POST, I2I 호출)
// 4. app/webhook/ad/replicate/image/route.ts (받고 바로 내부로 넘기기)
// 5. image/process/route.ts (POST, payload 검사, 이미지 Supabase 저장 및 RPC 처리)
// 6. RPC 검사 후 특정 Creative 완료 시 creative/[creative-index]/analysis/route.ts 호출