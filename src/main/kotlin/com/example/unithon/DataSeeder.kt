package com.example.unithon

import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import java.time.LocalDate

/**
 * 데모 시드 데이터. users/cards가 비어있을 때만(멱등) 채운다.
 * js/context.js의 caseData(PJ-014/021/033/040)와 동일한 내용으로 맞춰서,
 * 프론트를 mock에서 실제 API로 바꿔치기해도 화면이 그대로 보이게 한다.
 */
@Component
class DataSeeder(
    private val userRepository: UserRepository,
    private val cardRepository: CardRepository,
) : ApplicationRunner {

    override fun run(args: ApplicationArguments) {
        if (userRepository.count() > 0L) return

        val kim = userRepository.save(
            User(
                userId = "kimdohyun",
                name = "김도현",
                positionSeq = 1,
                positionName = "사원",
            ),
        )
        val jung = userRepository.save(
            User(
                userId = "junghaeun",
                name = "정하은",
                positionSeq = 1,
                positionName = "사원",
            ),
        )
        val lee = userRepository.save(
            User(
                userId = "leeseojun",
                name = "이서준",
                positionSeq = 1,
                positionName = "사원",
            ),
        )
        userRepository.save(
            User(
                userId = "parkjimin",
                name = "박지민",
                positionSeq = 1,
                positionName = "사원",
            ),
        )
        userRepository.save(
            User(
                userId = "admin",
                name = "관리자",
                positionSeq = 7,
                positionName = "이사",
            ),
        )

        cardRepository.save(
            Card(
                userSeq = requireNotNull(kim.userSeq),
                solution = "그룹웨어",
                category = "인증/로그인",
                title = "인증 시스템",
                decisionContent = "자체 세션 방식에서 OAuth2 기반 인증으로 전환",
                reasonContent = "자체 세션 관리 방식에서 토큰 재사용 취약점이 지적되어, 검증된 표준 프로토콜로 이전할 필요가 있다고 판단",
                evidenceContent = "외부 보안 감사 결과, 기존 세션 토큰이 만료 처리 없이 재사용 가능한 구조로 확인됨. 심각도 High로 분류되어 즉시 조치 필요...",
                evidenceSource = "보안감사 리포트 #INFRA-241",
                sourceApp = "GitHub",
                startedAt = LocalDate.of(2025, 3, 5),
            ),
        )
        cardRepository.save(
            Card(
                userSeq = requireNotNull(jung.userSeq),
                solution = "ERP",
                category = "결제/정산",
                title = "결제 모듈",
                decisionContent = "정기결제 재시도 로직을 최대 3회로 제한",
                reasonContent = "PG사 정책상 과도한 재시도는 카드사 차단으로 이어질 수 있어 3회로 제한",
                evidenceContent = "PG사 연동 가이드에서 결제 재시도가 3회를 초과할 경우 이상거래로 분류되어 일시 차단될 수 있다고 명시.",
                evidenceSource = "결제 정책 문서 #PAY-088",
                sourceApp = "Jira",
                startedAt = LocalDate.of(2025, 4, 10),
            ),
        )
        cardRepository.save(
            Card(
                userSeq = requireNotNull(lee.userSeq),
                solution = "MES",
                category = "인프라/배포",
                title = "배포 파이프라인",
                decisionContent = "CI 단계를 5단계에서 3단계로 축소",
                reasonContent = "빌드 시간 단축이 목적이며, 테스트 커버리지는 별도 파이프라인으로 분리해 유지",
                evidenceContent = "최근 1개월간 CI 파이프라인 실행 시간을 집계한 결과 평균 22분으로, 배포 지연의 주요 원인으로 지목됨.",
                evidenceSource = "인프라 리포트 #INFRA-260",
                sourceApp = "GitHub",
                startedAt = LocalDate.of(2025, 2, 20),
            ),
        )
        cardRepository.save(
            Card(
                userSeq = requireNotNull(lee.userSeq),
                solution = "MES",
                category = "인프라/배포",
                title = "CI 캐시 최적화",
                decisionContent = "의존성 설치 단계에 캐시 계층 추가",
                reasonContent = "동일 의존성을 매번 재설치하며 낭비되는 CI 시간을 줄이기 위함",
                evidenceSource = "벤치마크 리포트 #INFRA-268",
                sourceApp = "GitHub",
                startedAt = LocalDate.of(2025, 8, 1),
            ),
        )
    }
}
