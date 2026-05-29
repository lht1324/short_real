import * as cheerio from 'cheerio';

export function extractFalAIModelMetadataFromHtmlText(htmlText: string): { inputLabelList: string[], pricingText: string } {
    const $ = cheerio.load(htmlText);

    // 불필요한 태그 제거 (다이어트)
    $('head, style, script, svg').remove();

    // 1단계: Playground의 Input 섹션과 Result 섹션 컨테이너 통째로 잡기
    const inputH3 = $('h3').filter((_, el) => $(el).text().trim() === 'Input').first();
    const resultH3 = $('h3').filter((_, el) => $(el).text().trim().startsWith('Result')).first();

    const inputLabelList: string[] = [];
    let pricingText = "";

    if (inputH3.length > 0) {
        const inputContainer = inputH3.closest('.border-stroke-strong');
        if (inputContainer.length > 0) {
            // 2단계 (Input): .form-control 내부의 라벨 텍스트만 추출
            inputContainer.find('.form-control').each((_, el) => {
                // 라벨 텍스트 추출 (필수 표시인 * 등은 제거하지 않고 원본 그대로 둠. 처리는 route.ts에서)
                const label = $(el).find('label').text().replace(/\s+/g, ' ').trim();

                if (label) {
                    inputLabelList.push(label);
                }
            });
        }
    }

    if (resultH3.length > 0) {
        const resultContainer = resultH3.closest('.border-stroke-strong');
        if (resultContainer.length > 0) {
            // 2단계 (Result): 쓸데없는 버튼이나 상태값 무시하고 <p> 태그의 문장만 추출
            resultContainer.find('p').each((_, el) => {
                const pText = $(el).text().replace(/\s+/g, ' ').trim();
                if (pText) {
                    pricingText += pText + "\n";
                }
            });
            pricingText = pricingText.trim();
        }
    }

    return {
        inputLabelList,
        pricingText
    };
}