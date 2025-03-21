#### Next.js에 FSD를 적용할 때 애플리케이션 루트에 Next.js app과 pages를 저장하는 이유

Next.js App Router를 사용하면 `pages` 폴더 대신 `app` 폴더를 사용하여 라우팅을 할 수 있다.

FSD 원칙을 준수하기 위해서 Next.js의 `app` 폴더를 Next.js의 `pages` 폴더와 충돌을 해결하기 위한 권장 방식과 동일하게 취급해야한다.

따라서, Next.js의 `app` 폴더를 프로젝트의 루트 폴더로 이동하고, FSD `pages`를 Next.js `app` 폴더로 가져온다.

이렇게하여 `src` 폴더 내에서 FSD 프로젝트 구조를 유지할 수 있다.

또한 `pages` 폴더를 루트에 추가해야한다. 이는 App Router가 Pages Router와 호환되기 때문이다.
