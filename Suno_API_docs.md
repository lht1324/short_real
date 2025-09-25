# **Suno API 통합 가이드: 전체 API 명세서**

## **Suno API 아키텍처 개요**

Suno API는 최첨단 AI 모델을 활용하여 음악 생성, 가사 작성, 오디오 처리 등 포괄적인 기능을 제공하는 서비스입니다. 개발자는 애플리케이션에 이러한 기능을 손쉽게 통합할 수 있습니다. 특정 엔드포인트를 사용하기에 앞서, API 전반에 걸쳐 일관되게 적용되는 핵심 아키텍처 개념을 이해하는 것이 중요합니다. 이는 API의 동작 방식을 예측하고 안정적인 통합을 구현하는 데 필수적인 기반을 제공합니다.

### **인증 (Authentication)**

Suno API의 모든 엔드포인트는 보안을 위해 인증 절차를 요구합니다. API에 대한 모든 요청은 HTTP 헤더에 Bearer Token을 포함해야 합니다. 이 토큰은 각 사용자의 고유한 API 키를 나타냅니다.1

* **인증 방식**: Bearer Token 인증  
* **헤더 형식**: Authorization: Bearer YOUR\_API\_KEY  
* **API 키 발급**: API 키는 Suno API 공식 웹사이트의 'API 키 관리 페이지'에서 발급받을 수 있습니다.1 발급된 키는 외부 유출에 매우 주의해야 하며, 만약 키가 노출되었다고 의심될 경우 즉시 재발급받아야 합니다.

### **비동기 작업 처리 (Asynchronous Task Handling)**

음악 생성, 비디오 제작 등 Suno API의 핵심 기능 대부분은 완료까지 수십 초에서 수 분이 소요되는 장기 실행 작업(long-running task)입니다. 이러한 비동기 작업을 효율적으로 처리하기 위해 API는 두 가지 주요 메커니즘을 제공합니다: \*\*폴링(Polling)\*\*과 \*\*웹훅 콜백(Webhook Callback)\*\*입니다.

개발자는 애플리케이션의 요구사항과 구현 복잡도에 따라 적절한 방식을 선택해야 합니다. 이는 단순히 두 가지 옵션을 제공하는 것을 넘어, 개발 환경과 애플리케이션의 확장성을 고려한 설계적 선택입니다. 간단한 테스트나 스크립트 기반의 빠른 구현에는 폴링 방식이 적합할 수 있지만, 실시간 응답성과 시스템 효율성이 중요한 상용 서비스 환경에서는 웹훅 콜백 방식이 강력히 권장됩니다.

1. 폴링 (Polling)을 이용한 상태 확인  
   음악 생성과 같은 생성형 POST 요청을 보내면, API는 즉시 200 OK 응답과 함께 고유한 taskId를 반환합니다.2 이  
   taskId는 작업 접수증과 같으며, 실제 작업은 백그라운드에서 비동기적으로 처리됩니다. 개발자는 이 taskId를 사용하여 해당 작업의 상태를 조회하는 별도의 GET 엔드포인트(예: GET /api/v1/generate/record-info)를 주기적으로 호출(polling)하여 작업의 진행 상태(PENDING, GENERATING, SUCCESS, FAILED 등)를 확인할 수 있습니다.5 작업이 성공적으로 완료되면, 이  
   GET 응답에 최종 결과물(예: 오디오 파일 URL)이 포함됩니다.6 이 방식은 별도의 수신 서버가 필요 없어 구현이 간단하지만, 불필요한 요청이 발생할 수 있어 효율성이 떨어질 수 있습니다.  
2. 웹훅 콜백 (Webhook Callback)을 이용한 결과 수신  
   더 효율적이고 권장되는 방식은 웹훅 콜백을 사용하는 것입니다. 생성형 POST 요청 시 본문에 callBackUrl 파라미터를 포함하여 공개적으로 접근 가능한 HTTPS URL을 지정할 수 있습니다.5 작업이 완료되면(성공 또는 실패), Suno API 서버는 해당 URL로  
   POST 요청을 보내 작업 결과를 능동적으로 전달합니다.5 이 방식은 불필요한 폴링을 제거하여 시스템 부하를 줄이고, 작업 완료 즉시 결과를 수신할 수 있어 실시간 서비스 구현에 매우 유리합니다. 콜백 요청에 대해 개발자의 서버는 15초 이내에  
   200 OK로 응답해야 하며, 3회 연속 응답에 실패할 경우 Suno API는 해당 작업에 대한 콜백 전송을 중단합니다.5

### **표준 응답 구조 (Standard Response Structure)**

대부분의 Suno API 엔드포인트는 일관된 JSON 응답 구조를 따릅니다. 이는 개발자가 표준화된 방식으로 응답을 처리할 수 있도록 돕습니다.1

* code (Integer): HTTP 상태 코드와 유사한 역할을 하는 내부 상태 코드입니다. 200은 성공을 의미하며, 다른 숫자들은 다양한 오류 상황을 나타냅니다.2  
* msg (String): code에 대한 간단한 설명입니다. 성공 시 "success"가 반환되며, 오류 발생 시 해당 오류에 대한 메시지가 담깁니다.2  
* data (Object/Array/Value): 요청에 대한 실제 결과 데이터가 포함되는 페이로드(payload)입니다. 비동기 작업 요청 시에는 taskId가 담긴 객체가, 상태 조회 요청 시에는 상세한 작업 정보가 담긴 객체가 반환됩니다.5

### **데이터 보존 정책 (Data Retention Policy)**

Suno API를 통해 생성된 모든 미디어 파일(오디오, 비디오, 이미지 등)은 영구적으로 보관되지 않습니다. 일반적으로 생성 후 14일 또는 15일이 지나면 서버에서 자동으로 삭제됩니다.1 따라서 애플리케이션에서 중요한 결과물은 반드시 제공된 URL을 통해 다운로드하여 자체적인 저장소에 보관해야 합니다. 이는 서비스 운영에 있어 매우 중요한 정책이므로 개발자는 이를 반드시 인지하고 데이터 백업 로직을 구현해야 합니다.

## **Suno API 엔드포인트 요약**

다음 표는 Suno API에서 제공하는 모든 엔드포인트를 기능 그룹별로 정리한 요약본입니다. 특정 기능을 빠르게 찾고 API의 전체적인 구조를 파악하는 데 도움이 될 것입니다.11

| 기능 그룹 (Functional Group) | 세부 기능 (Specific Function) | HTTP 메서드 (Method) | 엔드포인트 경로 (Path) |
| :---- | :---- | :---- | :---- |
| **음악 생성 (Music Generation)** | 음악 생성 | POST | /api/v1/generate |
|  | 음악 생성 콜백 | GET | /suno-api/generate-music-callbacks |
|  | 음악 확장 | POST | /api/v1/generate/extend |
|  | 음악 확장 콜백 | GET | /suno-api/extend-music-callbacks |
|  | 오디오 업로드 및 커버 | POST | /api/v1/generate/upload-cover |
|  | 오디오 업로드 및 커버 콜백 | GET | /suno-api/upload-and-cover-audio-callbacks |
|  | 오디오 업로드 및 확장 | POST | /api/v1/generate/upload-extend |
|  | 오디오 업로드 및 확장 콜백 | GET | /suno-api/upload-and-extend-audio-callbacks |
|  | 반주 추가 | POST | /api/v1/generate/add-instrumental |
|  | 반주 추가 콜백 | GET | /suno-api/add-instrumental-callbacks |
|  | 보컬 추가 | POST | /api/v1/generate/add-vocals |
|  | 보컬 추가 콜백 | GET | /suno-api/add-vocals-callbacks |
|  | 음악 생성 상세 정보 조회 | GET | /api/v1/generate/record-info |
|  | 타임스탬프 가사 조회 | POST | /api/v1/generate/get-timestamped-lyrics |
|  | 음악 스타일 강화 | POST | /api/v1/suno/boost |
|  | 음악 커버 이미지 생성 | POST | /api/v1/suno/cover/generate |
|  | 음악 커버 생성 콜백 | GET | /suno-api/cover-suno-callbacks |
|  | 음악 커버 상세 정보 조회 | GET | /api/v1/suno/cover/record-info |
| **가사 생성 (Lyrics Generation)** | 가사 생성 | POST | /api/v1/lyrics |
|  | 가사 생성 콜백 | GET | /suno-api/generate-lyrics-callbacks |
|  | 가사 생성 상세 정보 조회 | GET | /api/v1/lyrics/record-info |
| **오디오 처리 (Audio Processing)** | WAV 형식 변환 | POST | /api/v1/wav/generate |
|  | WAV 변환 콜백 | GET | /suno-api/convert-to-wav-format-callbacks |
|  | WAV 변환 상세 정보 조회 | GET | /api/v1/wav/record-info |
|  | 보컬 및 악기 분리 | POST | /api/v1/vocal-removal/generate |
|  | 오디오 분리 콜백 | GET | /suno-api/separate-vocals-from-music-callbacks |
|  | 오디오 분리 상세 정보 조회 | GET | /api/v1/vocal-removal/record-info |
| **뮤직 비디오 생성 (Music Video)** | 뮤직 비디오 생성 | POST | /api/v1/mp4/generate |
|  | 뮤직 비디오 생성 콜백 | GET | /suno-api/create-music-video-callbacks |
|  | 뮤직 비디오 상세 정보 조회 | GET | /api/v1/mp4/record-info |
| **계정 및 파일 관리 (Account & File)** | 잔여 크레딧 조회 | GET | /api/v1/generate/credit |
|  | Base64 파일 업로드 | POST | /api/file-base64-upload |
|  | 파일 스트림 업로드 | POST | /api/file-stream-upload |
|  | URL 파일 업로드 | POST | /api/file-url-upload |

## **섹션 1: 음악 생성 API**

음악 생성 API는 Suno 서비스의 핵심 기능으로, 텍스트 프롬프트나 다양한 파라미터를 조합하여 독창적인 음악을 만들고, 기존 음악을 확장하거나 변형하는 등 다채로운 기능을 제공합니다. 개발자는 애플리케이션의 목적에 따라 간단한 프롬프트 입력만으로 완전한 곡을 생성하는 단일형(monolithic) 워크플로우를 구성하거나, 가사 생성, 악기 추가 등 여러 API를 조합하여 세밀한 제어가 가능한 모듈형(modular) 워크플로우를 설계할 수 있습니다.

### **1.1 음악 생성 (Generate Suno AI Music)**

이 엔드포인트는 텍스트 설명이나 상세 파라미터를 기반으로 고품질의 AI 음악을 생성하는 가장 기본적인 API입니다. 한 번의 요청으로 서로 다른 스타일의 두 곡이 생성됩니다.5

* **Endpoint**: POST /api/v1/generate  
* **설명**: 텍스트 프롬프트를 기반으로 가사와 멜로디를 포함한 완전한 노래를 생성하거나, 사용자가 직접 제공한 가사, 스타일, 제목 등을 기반으로 맞춤형 음악을 생성합니다. 스트리밍 URL은 약 30-40초, 다운로드 가능한 MP3 URL은 약 2-3분 내에 준비됩니다.5

#### **파라미터**

요청 본문은 JSON 형식이며, customMode 값에 따라 필수 파라미터가 달라지는 복합적인 구조를 가집니다.

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :---- | :---- | :---- | :---- |
| customMode | Boolean | 필수 | true로 설정 시 '커스텀 모드'가 활성화되어 style, title 등 상세 파라미터 설정이 가능합니다. false일 경우 '일반 모드'로, prompt만으로 음악을 생성합니다.5 |
| instrumental | Boolean | 필수 | true로 설정 시 보컬이 없는 연주곡을 생성합니다.5 |
| model | String | 필수 | 사용할 AI 모델 버전을 지정합니다. V3\_5, V4, V4\_5 중 선택할 수 있으며, 각 모델은 음질, 생성 가능 길이, 창의성 등에서 차이가 있습니다.5 |
| callBackUrl | String | 필수 | 작업 완료 결과를 수신할 웹훅 URL입니다. 폴링을 원할 경우에도 빈 문자열이 아닌 유효한 URL 형식을 전달해야 합니다.5 |
| prompt | String | 조건부 필수 | **일반 모드 (customMode: false)**: 필수 항목이며, 음악의 전반적인 분위기와 내용을 설명하는 프롬프트로 사용됩니다 (최대 400자). AI가 이 프롬프트를 기반으로 가사를 자동 생성합니다. **커스텀 모드 (customMode: true)**: instrumental이 false일 때 필수 항목이며, 여기에 입력된 텍스트가 그대로 가사로 사용됩니다 (모델별 3000-5000자 제한).5 |
| style | String | 조건부 필수 | **커스텀 모드**: 필수 항목이며, 'Pop', 'Jazz', 'Rock' 등 음악의 장르나 스타일을 지정합니다 (모델별 200-1000자 제한). **일반 모드**: 사용하지 않습니다.5 |
| title | String | 조건부 필수 | **커스텀 모드**: 필수 항목이며, 생성될 음악의 제목을 지정합니다 (최대 80자). **일반 모드**: 사용하지 않습니다.5 |
| negativeTags | String | 선택 | 생성될 음악에서 제외하고 싶은 스타일이나 특성을 지정합니다. 예: "sad, slow".5 |
| vocalGender | String | 선택 | 보컬의 성별을 지정합니다. m (남성) 또는 f (여성).5 |
| styleWeight | Number | 선택 | 지정한 style 가이드라인의 영향력을 조절합니다 (범위: 0.00-1.00).5 |
| weirdnessConstraint | Number | 선택 | AI의 창의적 일탈 수준을 제어합니다 (범위: 0.00-1.00).5 |
| audioWeight | Number | 선택 | (업로드 기반 기능에서) 원본 오디오의 영향력을 조절합니다 (범위: 0.00-1.00).5 |

#### **요청 및 응답 예시**

**요청 (커스텀 모드)**

JSON

{  
  "prompt": "\[Verse\]\\nNight city lights shining bright",  
  "style": "electrifying, rock",  
  "title": "Iron Man",  
  "customMode": true,  
  "instrumental": false,  
  "model": "V3\_5",  
  "callBackUrl": "https://api.example.com/callback"  
}

**성공 응답**

JSON

{  
  "code": 200,  
  "msg": "success",  
  "data": {  
    "taskId": "2fac\*\*\*\*9f72"  
  }  
}

이후 callBackUrl로 작업 결과가 전송되거나, 반환된 taskId를 사용하여 GET /api/v1/generate/record-info로 상태를 조회할 수 있습니다.

### **1.2 음악 생성 상세 정보 조회 (Get Music Generation Details)**

POST /api/v1/generate 또는 POST /api/v1/generate/extend를 통해 시작된 음악 생성 작업의 현재 상태와 결과를 조회합니다. 콜백을 사용하지 않고 폴링 방식으로 결과를 확인하고자 할 때 사용됩니다.6

* **Endpoint**: GET /api/v1/generate/record-info  
* **설명**: taskId를 파라미터로 전달하여 특정 작업의 진행 상태, 사용된 파라미터, 그리고 완료 시 생성된 오디오 및 이미지 파일의 URL을 포함한 상세 정보를 반환합니다.6

#### **파라미터**

| 파라미터 | 위치 | 타입 | 필수 여부 | 설명 |
| :---- | :---- | :---- | :---- | :---- |
| taskId | Query | String | 필수 | 조회할 음악 생성 작업의 고유 ID입니다.6 |

#### **응답 예시 (성공)**

JSON

{  
  "code": 200,  
  "msg": "success",  
  "data": {  
    "taskId": "5c79\*\*\*\*be8e",  
    "status": "SUCCESS",  
    "operationType": "generate",  
    "response": {  
      "taskId": "5c79\*\*\*\*be8e",  
      "sunoData": \[  
        {  
          "id": "8551\*\*\*\*662c",  
          "audioUrl": "https://example.cn/\*\*\*\*.mp3",  
          "streamAudioUrl": "https://example.cn/\*\*\*\*",  
          "imageUrl": "https://example.cn/\*\*\*\*.jpeg",  
          "title": "Iron Man",  
          "tags": "electrifying, rock",  
          "duration": 198.44  
        },  
        {  
          "id": "bd15\*\*\*\*1873",  
          "audioUrl": "https://example.cn/\*\*\*\*.mp3",  
          "streamAudioUrl": "https://example.cn/\*\*\*\*",  
          "imageUrl": "https://example.cn/\*\*\*\*.jpeg",  
          "title": "Iron Man",  
          "tags": "electrifying, rock",  
          "duration": 228.28  
        }  
      \]  
    },  
    "errorCode": null,  
    "errorMessage": null  
  }  
}

data.status 필드를 통해 작업의 현재 상태(PENDING, SUCCESS, GENERATE\_AUDIO\_FAILED 등)를 확인할 수 있습니다.6

### **1.3 음악 확장 (Extend Music)**

이미 생성된 음악 트랙을 특정 지점부터 자연스럽게 이어 붙여 더 긴 곡으로 확장합니다.5

* **Endpoint**: POST /api/v1/generate/extend  
* **설명**: audioId로 원본 음악을 지정하고, continueAt으로 확장 시작 시간을 초 단위로 설정합니다. defaultParamFlag를 통해 원본의 파라미터를 그대로 사용할지, 새로운 파라미터를 적용할지 선택할 수 있습니다.5

#### **파라미터**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :---- | :---- | :---- | :---- |
| defaultParamFlag | Boolean | 필수 | true일 경우 prompt, style 등 새로운 파라미터를 직접 입력해야 합니다. false일 경우 원본 오디오의 설정을 그대로 사용하여 확장합니다.5 |
| audioId | String | 필수 | 확장할 원본 오디오 트랙의 고유 ID입니다.5 |
| model | String | 필수 | 원본 오디오 생성에 사용된 모델과 동일한 버전을 지정해야 합니다.5 |
| callBackUrl | String | 필수 | 작업 완료 결과를 수신할 웹훅 URL입니다.5 |
| continueAt | Number | 조건부 필수 | defaultParamFlag가 true일 때 필수. 확장을 시작할 시간(초)입니다. 0보다 크고 원본 오디오의 전체 길이보다 작아야 합니다.5 |
| prompt, style, title | String | 조건부 필수 | defaultParamFlag가 true일 때 필수인 파라미터들입니다.5 |

### **1.4 오디오 업로드 및 커버 (Upload And Cover Audio)**

사용자가 직접 업로드한 오디오 파일의 멜로디는 유지하면서 전혀 다른 스타일의 곡으로 재창조(커버)합니다.2

* **Endpoint**: POST /api/v1/generate/upload-cover  
* **설명**: uploadUrl을 통해 외부에서 접근 가능한 오디오 파일의 URL을 제공받아 커버 음악을 생성합니다. 이 기능은 섹션 5의 파일 업로드 API와 연계하여 사용됩니다. customMode 등 음악 생성 API와 유사한 파라미터를 사용하여 커버 곡의 스타일을 제어할 수 있습니다.2  
* **주의사항**: 문서에 따라 업로드 가능한 오디오의 최대 길이가 2분 또는 8분으로 상이하게 명시되어 있어, 실제 사용 시 테스트가 필요합니다.2

### **1.5 오디오 업로드 및 확장 (Upload And Extend Audio)**

사용자가 업로드한 오디오 파일을 기반으로 음악을 확장합니다. POST /api/v1/generate/extend와 기능적으로 유사하지만, Suno API를 통해 생성된 음악이 아닌 외부 오디오를 대상으로 합니다.12

* **Endpoint**: POST /api/v1/generate/upload-extend  
* **설명**: uploadUrl로 제공된 오디오 파일을 지정된 continueAt 지점부터 새로운 내용으로 확장합니다. 이 기능 역시 파일 업로드 API와 연계됩니다.12

### **1.6 반주 추가 및 보컬 추가**

이 두 엔드포인트는 모듈형 작곡 워크플로우의 핵심입니다. 이미 존재하는 보컬 트랙에 반주를 입히거나, 반주 트랙에 보컬을 추가하는 기능을 각각 수행합니다.

#### **반주 추가 (Add Instrumental)**

* **Endpoint**: POST /api/v1/generate/add-instrumental  
* **설명**: 사용자가 업로드한 보컬 또는 멜로디 오디오 파일(uploadUrl)에 어울리는 악기 반주를 생성합니다. title, tags 등을 통해 원하는 반주 스타일을 지정할 수 있습니다.3

#### **보컬 추가 (Add Vocals)**

* **Endpoint**: POST /api/v1/generate/add-vocals  
* **설명**: 사용자가 업로드한 반주 트랙(uploadUrl)에 AI가 생성한 보컬을 추가합니다. prompt를 통해 가사나 보컬의 분위기를 설명하고, style로 장르를 지정하여 조화로운 보컬 트랙을 생성합니다.10

### **1.7 음악 커버 이미지 생성 (Generate Music Cover)**

Suno API로 생성된 음악에 대해 AI가 어울리는 앨범 커버 이미지를 생성합니다.13

* **Endpoint**: POST /api/v1/suno/cover/generate  
* **설명**: 원본 음악 생성 작업의 taskId를 입력받아 해당 음악에 대한 커버 이미지를 생성합니다. 하나의 음악 taskId에 대해 커버 이미지는 한 번만 생성할 수 있다는 제약이 있습니다.13

### **1.8 음악 커버 상세 정보 조회 (Get Music Cover Details)**

커버 이미지 생성 작업의 상태를 확인하고, 완료 시 생성된 이미지들의 URL을 조회합니다.1

* **Endpoint**: GET /api/v1/suno/cover/record-info  
* **설명**: 커버 생성 요청 시 반환된 taskId를 사용하여 작업 상태를 폴링하고, 성공 시 response.images 배열에 포함된 이미지 URL 목록을 가져옵니다. 일반적으로 두 가지 스타일의 커버 이미지가 생성됩니다.1

## **섹션 2: 가사 생성 API**

이 API 그룹은 오디오 생성 없이 텍스트, 즉 가사만을 생성하는 데 특화되어 있습니다. 사용자는 먼저 여러 버전의 가사를 생성하여 검토하고, 그중 가장 마음에 드는 것을 선택하여 후속 음악 생성 단계의 입력값으로 활용하는 모듈형 워크플로우를 구성할 수 있습니다.

### **2.1 가사 생성 (Generate Lyrics)**

텍스트 프롬프트를 기반으로 AI가 여러 버전의 노래 가사를 창작합니다.7

* **Endpoint**: POST /api/v1/lyrics  
* **설명**: prompt에 원하는 가사의 주제, 분위기, 스타일 등을 200단어 이내로 서술하면, AI가 \[Verse\], \[Chorus\]와 같은 구조적 마커를 포함한 여러 버전의 가사를 생성하여 반환합니다. 이 결과물은 customMode: true로 설정된 음악 생성 API의 prompt 파라미터에 직접 사용할 수 있습니다.7

#### **파라미터**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :---- | :---- | :---- | :---- |
| prompt | String | 필수 | 가사의 주제와 내용을 설명하는 텍스트입니다 (최대 200단어).7 |
| callBackUrl | String | 필수 | 가사 생성이 완료되었을 때 결과를 수신할 웹훅 URL입니다.7 |

### **2.2 가사 생성 상세 정보 조회 (Get Lyrics Generation Details)**

POST /api/v1/lyrics를 통해 시작된 가사 생성 작업의 결과를 조회하는 폴링용 엔드포인트입니다.14

* **Endpoint**: GET /api/v1/lyrics/record-info  
* **설명**: taskId를 파라미터로 전달하여 해당 작업의 상태를 확인하고, 성공적으로 완료되었을 경우 생성된 모든 가사 버전이 포함된 배열을 응답으로 받습니다.14

#### **응답 예시 (성공)**

JSON

{  
  "code": 200,  
  "msg": "success",  
  "data": {  
    "taskId": "11dc\*\*\*\*8b0f",  
    "status": "SUCCESS",  
    "response": {  
      "taskId": "11dc\*\*\*\*8b0f",  
      "data": \[  
        {  
          "text": "\[Verse\]\\nWalking through the city's darkest night...",  
          "title": "Iron Man",  
          "status": "complete"  
        },  
        {  
          "text": "\[Verse\]\\nWind is calling out my name...",  
          "title": "Iron Man",  
          "status": "complete"  
        }  
      \]  
    }  
  }  
}

### **2.3 타임스탬프 가사 조회 (Get Timestamped Lyrics)**

이미 생성된 음악의 가사에 대해 단어 또는 구문 단위의 정확한 시간 정보(타임스탬프)를 조회합니다. 이는 노래방 애플리케이션이나 음악 플레이어의 가사 동기화 기능 구현에 필수적입니다.15

* **Endpoint**: POST /api/v1/generate/get-timestamped-lyrics  
* **설명**: taskId와 함께 특정 오디오를 식별하기 위한 audioId 또는 musicIndex를 전달하면, 해당 곡의 가사와 각 단어의 시작 및 종료 시간(초 단위) 정보를 반환합니다.15

## **섹션 3: 오디오 처리 API**

이 API 그룹은 이미 생성된 오디오 파일을 후처리하거나 변환하는 유틸리티성 기능을 제공합니다. 전문적인 오디오 편집, 리믹스, 가라오케 제작 등 다양한 고급 활용 사례를 지원합니다.

### **3.1 WAV 형식 변환 (Convert to WAV Format)**

생성된 MP3 형식의 음악 파일을 고품질의 비압축 WAV 파일로 변환합니다.16

* **Endpoint**: POST /api/v1/wav/generate  
* **설명**: 전문적인 오디오 편집이나 프로덕션 작업을 위해 음원 손실이 없는 원본 품질이 필요할 때 사용됩니다. taskId와 audioId로 변환할 트랙을 지정합니다. WAV 파일은 MP3에 비해 파일 크기가 훨씬 크다는 점을 유의해야 합니다.16

### **3.2 WAV 변환 상세 정보 조회 (Get WAV Conversion Details)**

WAV 변환 작업의 상태를 확인하고, 완료 시 생성된 WAV 파일의 다운로드 URL을 조회합니다.17

* **Endpoint**: GET /api/v1/wav/record-info  
* **설명**: taskId를 사용하여 WAV 변환 작업의 진행 상태를 폴링하고, 성공 시 응답 객체의 response.audio\_wav\_url 필드를 통해 결과 파일에 접근할 수 있습니다.17

### **3.3 보컬 및 악기 분리 (Vocal & Instrument Stem Separation)**

하나의 오디오 트랙에서 보컬과 반주, 또는 개별 악기 파트(스템)를 분리해내는 강력한 기능입니다.18

* **Endpoint**: POST /api/v1/vocal-removal/generate  
* **설명**: type 파라미터를 통해 분리 모드를 선택할 수 있습니다. 이는 기능뿐만 아니라 크레딧 소모량에도 직접적인 영향을 미치므로, 개발자는 비즈니스 로직 설계 시 이 차이를 명확히 인지해야 합니다.  
  * type: separate\_vocal (기본값): 보컬과 반주, 두 개의 스템으로 분리합니다. 1 크레딧이 소모됩니다.4  
  * type: split\_stem: 보컬, 드럼, 베이스, 기타 등 최대 12개의 개별 악기 스템으로 정밀하게 분리합니다. 5 크레딧이 소모됩니다.4

### **3.4 오디오 분리 상세 정보 조회 (Get Audio Separation Details)**

오디오 분리 작업의 상태를 확인하고, 완료 시 분리된 모든 스템 파일의 URL을 조회합니다.19

* **Endpoint**: GET /api/v1/vocal-removal/record-info  
* **설명**: taskId를 사용하여 작업 상태를 폴링합니다. 응답의 JSON 구조는 요청 시 선택했던 type에 따라 달라집니다. separate\_vocal의 경우 instrumentalUrl과 vocalUrl이, split\_stem의 경우 drumsUrl, bassUrl 등 더 세분화된 필드들이 채워져 반환됩니다.19

### **3.5 음악 스타일 강화 (Boost Music Style)**

* **Endpoint**: POST /api/v1/suno/boost  
* **문서 접근 불가**: 이 보고서 작성 시점 기준으로 해당 엔드포인트에 대한 공식 문서는 접근이 불가능한 상태였습니다.20 따라서 상세한 기능 및 파라미터 정보를 제공할 수 없습니다.

## **섹션 4: 뮤직 비디오 생성 API**

생성된 음악을 기반으로 시각 효과가 포함된 동영상을 제작하는 기능을 제공합니다. 소셜 미디어 공유나 음악 프로모션 콘텐츠 제작에 유용합니다.

### **4.1 뮤직 비디오 생성 (Create Music Video)**

특정 오디오 트랙에 대해 동기화된 시각 효과를 포함하는 MP4 형식의 비디오를 생성합니다.21

* **Endpoint**: POST /api/v1/mp4/generate  
* **설명**: taskId와 audioId로 원본 오디오를 지정합니다. author(아티스트명)와 domainName(워터마크) 같은 선택적 파라미터를 통해 비디오에 브랜딩 요소를 추가할 수 있습니다.21

### **4.2 뮤직 비디오 상세 정보 조회 (Get Music Video Details)**

* **Endpoint**: GET /api/v1/mp4/record-info  
* **문서 접근 불가**: 이 보고서 작성 시점 기준으로 해당 엔드포인트에 대한 공식 문서는 접근이 불가능한 상태였습니다.22 따라서 상세한 기능 및 파라미터 정보를 제공할 수 없습니다.

## **섹션 5: 계정 및 파일 관리 API**

서비스 이용에 필수적인 유틸리티성 API 그룹입니다. 계정의 크레딧 상태를 확인하거나, 외부 오디오 파일을 Suno 서버에 업로드하는 기능을 포함합니다.

### **5.1 잔여 크레딧 조회 (Get Remaining Credits)**

계정에 남아있는 사용 가능한 크레딧 잔액을 확인합니다.4

* **Endpoint**: GET /api/v1/generate/credit  
* **설명**: 파라미터 없이 GET 요청을 보내면 현재 계정의 크레딧 잔액을 정수 값으로 반환합니다. 매우 가벼운 요청이므로 크레딧을 소모하는 작업을 호출하기 전에 이 엔드포인트를 통해 잔액을 확인하는 것이 좋습니다. 이를 통해 429 Insufficient credits 오류를 사전에 방지하고 사용자에게 더 나은 경험을 제공할 수 있습니다.4

### **5.2 파일 업로드 (File Upload APIs)**

'오디오 업로드 및 커버', '오디오 업로드 및 확장' 등 사용자의 파일을 기반으로 하는 기능을 사용하기 위해 파일을 Suno 서버에 임시로 업로드하는 API입니다. Suno API는 클라이언트 환경과 파일의 특성에 따라 최적의 방법을 선택할 수 있도록 세 가지 다른 업로드 방식을 제공합니다. 이는 단순한 중복이 아니라, 개발 편의성과 전송 효율성을 모두 고려한 설계적 배려입니다.

* **Base64 인코딩 방식**은 클라이언트 측 JavaScript에서 JSON 페이로드에 파일 데이터를 쉽게 포함시킬 수 있어 구현이 간단하지만, 데이터 크기가 약 33% 증가하여 대용량 파일에는 비효율적입니다.  
* **파일 스트림 방식**은 multipart/form-data를 사용하여 바이너리 데이터를 직접 전송하므로 대용량 파일에 가장 효율적이며, 주로 서버 측 애플리케이션에서 사용됩니다.  
* **URL 방식**은 클라이언트가 아닌 Suno 서버가 직접 URL로부터 파일을 다운로드하게 하므로, 클라이언트의 네트워크 부하를 줄이고 다른 클라우드 저장소와 연동할 때 유용합니다.

#### **Base64 파일 업로드**

* **Endpoint**: POST /api/file-base64-upload  
* **설명**: 파일 데이터를 Base64로 인코딩하여 JSON 본문에 담아 전송합니다. 작은 이미지 파일 등에 적합합니다.7

#### **파일 스트림 업로드**

* **Endpoint**: POST /api/file-stream-upload  
* **설명**: multipart/form-data 형식을 사용하여 파일의 바이너리 스트림을 직접 업로드합니다. 10MB 이상의 대용량 파일에 권장됩니다.7

#### **URL 파일 업로드**

* **Endpoint**: POST /api/file-url-upload  
* **설명**: 공개적으로 접근 가능한 파일의 URL을 제공하면, Suno 서버가 해당 URL에서 파일을 직접 다운로드하여 업로드합니다.7

## **부록: 공통 상태 코드 및 오류 처리**

Suno API는 HTTP 표준 상태 코드와 함께 자체적인 code 값을 사용하여 요청의 성공, 실패 및 다양한 오류 상황을 전달합니다. 다음 표는 API 전반에서 공통적으로 나타나는 상태 코드와 그 의미, 그리고 권장되는 개발자 조치를 정리한 것입니다.

| 코드 (Code) | 메시지 (Message) | 설명 (Description) | 권장 조치 (Recommended Action) |
| :---- | :---- | :---- | :---- |
| 200 | success | 요청이 성공적으로 처리되었습니다. | 응답의 data 필드를 파싱하여 후속 로직을 진행합니다. |
| 400 | Invalid parameters / Format error | 요청 파라미터가 누락되었거나 형식이 잘못되었습니다. | API 명세서를 다시 확인하여 요청 본문이나 쿼리 파라미터가 올바른지 검증합니다. |
| 401 | Unauthorized | 인증 헤더가 누락되었거나 API 키가 유효하지 않습니다. | 유효한 API 키를 Authorization: Bearer \<token\> 형식의 헤더에 포함하여 다시 요청합니다. |
| 402 | Insufficient credits | 계정의 크레딧이 부족하여 작업을 수행할 수 없습니다. | GET /api/v1/generate/credit으로 잔액을 확인하고, 사용자에게 크레딧 충전을 안내합니다. |
| 404 | Not found | 요청한 엔드포인트 경로가 존재하지 않습니다. | 엔드포인트 URL 주소가 올바른지 확인합니다. |
| 409 | Conflict | 이미 생성된 리소스를 다시 생성하려고 시도했습니다 (예: 음악 커버 중복 생성). | 해당 리소스가 이미 존재하는지 확인하고, 생성 대신 조회 로직을 수행하도록 변경합니다. |
| 422 | Validation error | 서버 측 유효성 검사를 통과하지 못했습니다. | 파라미터 값의 범위나 제약 조건을 확인합니다 (예: continueAt이 오디오 길이보다 큰 경우). |
| 429 | Rate limited / Your call frequency is too high | 단시간에 너무 많은 요청을 보내 API 호출 제한을 초과했습니다. | 요청 빈도를 줄이거나, 지수 백오프(exponential backoff)를 적용한 재시도 로직을 구현합니다. |
| 455 | Service unavailable | 현재 시스템 점검 중으로 서비스를 사용할 수 없습니다. | 잠시 후 다시 시도하거나, 서비스 상태 페이지를 확인합니다. |
| 500 | Server error | Suno API 서버 내부에서 예기치 않은 오류가 발생했습니다. | 일시적인 문제일 수 있으므로 잠시 후 재시도하고, 문제가 지속될 경우 Suno API 지원팀에 문의합니다. |

#### **참고 자료**

1. Get Music Cover Details \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/get-cover-suno-details](https://docs.sunoapi.org/suno-api/get-cover-suno-details)  
2. Upload And Cover Audio \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/upload-and-cover-audio](https://docs.sunoapi.org/suno-api/upload-and-cover-audio)  
3. Add Instrumental \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/add-instrumental](https://docs.sunoapi.org/suno-api/add-instrumental)  
4. Get Remaining Credits \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/get-remaining-credits](https://docs.sunoapi.org/suno-api/get-remaining-credits)  
5. Music Generation Callbacks \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/generate-music-callbacks](https://docs.sunoapi.org/suno-api/generate-music-callbacks)  
6. Get Music Generation Details \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/get-music-generation-details](https://docs.sunoapi.org/suno-api/get-music-generation-details)  
7. Lyrics Generation Callbacks \- Suno API \- Suno API Documentation, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/generate-lyrics-callbacks](https://docs.sunoapi.org/suno-api/generate-lyrics-callbacks)  
8. Upload and Cover Audio Callbacks \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/upload-and-cover-audio-callbacks](https://docs.sunoapi.org/suno-api/upload-and-cover-audio-callbacks)  
9. Extend Music \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/extend-music](https://docs.sunoapi.org/suno-api/extend-music)  
10. Add Vocals \- Suno API \- Suno API Documentation, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/add-vocals](https://docs.sunoapi.org/suno-api/add-vocals)  
11. docs.sunoapi.org, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api](https://docs.sunoapi.org/suno-api)  
12. Upload and Extend Audio Callbacks \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/upload-and-extend-audio-callbacks](https://docs.sunoapi.org/suno-api/upload-and-extend-audio-callbacks)  
13. Generate Music Cover \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/cover-suno](https://docs.sunoapi.org/suno-api/cover-suno)  
14. Get Lyrics Generation Details \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/get-lyrics-generation-details](https://docs.sunoapi.org/suno-api/get-lyrics-generation-details)  
15. Get Timestamped Lyrics \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/get-timestamped-lyrics](https://docs.sunoapi.org/suno-api/get-timestamped-lyrics)  
16. Convert to WAV Format \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/convert-to-wav-format](https://docs.sunoapi.org/suno-api/convert-to-wav-format)  
17. Get WAV Conversion Details \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/get-wav-conversion-details](https://docs.sunoapi.org/suno-api/get-wav-conversion-details)  
18. Audio Separation Callbacks \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/separate-vocals-from-music-callbacks](https://docs.sunoapi.org/suno-api/separate-vocals-from-music-callbacks)  
19. Get Audio Separation Details \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/get-vocal-separation-details](https://docs.sunoapi.org/suno-api/get-vocal-separation-details)  
20. 1월 1, 1970에 액세스, [https://docs.sunoapi.org/suno-api/boost-music-style](https://docs.sunoapi.org/suno-api/boost-music-style)  
21. Create Music Video \- Suno API, 9월 19, 2025에 액세스, [https://docs.sunoapi.org/suno-api/create-music-video](https://docs.sunoapi.org/suno-api/create-music-video)  
22. 1월 1, 1970에 액세스, [https://docs.sunoapi.org/suno-api/get-music-video-details](https://docs.sunoapi.org/suno-api/get-music-video-details)