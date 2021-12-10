# 단축 링크 생성 서버

주소 : [https://redire.ction.link/](https://redire.ction.link)

이번에 Redis를 공부해볼 겸, 간단한 단축 URL 생성기를 만들어보기로 했다. Redis를 공부하는 것인 만큼 매우 빠른 응답시간을 갖는 서버를 만드는 것이 목적이다.

- Redis의 INCR를 사용하여 매번 고유한 숫자를 생성하고(이를 hash라 하자), URL > hash, hash > URL 변환을 key-value로 저장한다.
- 실제로는 단순히 10진수 숫자를 저장하는 것보다 이를 적당히 인코딩하여 저장하는 것이 URL 길이를 더 짧게 할 수 있으므로 URL-safe한 문자들로 이루어진 N진수를 hash로 한다.
- URL 생성하기 버튼을 눌렀는데 기존에 이미 같은 URL에 대한 해시가 저장되어있다면 (cache hit) 해당 해시를 반환한다.
- 그렇지 않다면 (cache miss) 새로운 해시를 생성하고 key-value로 저장한다.
- URL 조회 시 만약 등록된 해시가 있다면(cache hit) 301 redirection으로 해당 URL로 리다이렉션한다.
- 만약 등록된 해시가 없다면(cache miss) 404를 반환한다.

## 테스트

아래는 서버와 같은 네트워크 내에서 테스트해본 결과다.

- URL 생성(cache miss)은 평균적으로 20ms정도가 걸린다.
  - (16ms, 15ms, 27ms, 15ms, 37ms, 15ms)
- URL 생성(cache hit)은 마찬가지로 20ms정도가 걸린다.
  - (12ms, 16ms, 15ms, 24ms, 24ms, 13ms)
- URL 조회는 (cache hit) 평균적으로 19ms정도가 걸린다.
  - (17ms, 16ms, 15ms, 22ms, 25ms, 22ms)
- URL 조회는 (cache miss) 평균적으로 18ms정도가 걸린다.
  - (19ms, 20ms, 15ms, 13ms, 24ms, 15ms)

나름 나쁘지 않은 결과인 듯...?

## 아키텍쳐

백엔드는 `Node` + `Koa` + `Redis`를 사용했고 프론트엔드는 그냥 순수 HTML과 JS로 작성했다. 이 서버는 어차피 트래픽이 크지도 않을 것이고 개발 연습용으로 사용하는 것이기 때문에 CI / CD 등은 구현하지 않았다.

라우팅은 쿠버네티스가 올라가 있는 우리집 서버로 해당 도메인을 연결해둔 후, 쿠버네티스 내에서 External Name Service 리소스 서비스를 생성, Traefik을 사용하여 라우팅하도록 구성했다.
