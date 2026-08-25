"""
scripts/build_embeddings.py

시드 질문(scripts/seeds.json)을 한국어 SBERT(jhgan/ko-sroberta-multitask)로 임베딩해
static/data/embeddings.json / demo_queries.json을 생성한다.

임베딩 대상: 질문(q)만. 답변(a)은 임베딩하지 않는다.
  - 질문+답변을 합쳐 임베딩하는 것도 실험했다. 오탐(관련 없는 항목이 상위로
    올라오는 최고 유사도) 최고치는 0.730 -> 0.576으로 개선됐지만, 답변까지
    포함하면 벡터가 담는 텍스트 길이가 길어져 한두 문장짜리 실제 사용자
    쿼리와의 길이 비대칭이 커지고, 그 결과 의미가 실제로 가까운 질문을
    상위로 끌어올리는 검색 품질 자체는 오히려 떨어졌다. 그래서 질문 단독
    임베딩을 최종 채택했다.

실행:
    pip install -r scripts/requirements.txt
    python scripts/build_embeddings.py
"""

import json
import sys
from pathlib import Path

from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent.parent
SEEDS_PATH = ROOT / "scripts" / "seeds.json"
EMBEDDINGS_OUT = (
    ROOT / "src" / "main" / "resources" / "static" / "data" / "embeddings.json"
)
DEMO_QUERIES_OUT = (
    ROOT / "src" / "main" / "resources" / "static" / "data" / "demo_queries.json"
)

MODEL_NAME = "jhgan/ko-sroberta-multitask"

# 시연용 예시 쿼리 3건. 시드 문구를 그대로 쓰지 않고, 사용자가 검색창에
# 입력할 법한 자연스러운 변형 표현을 사용한다. index.html의 데모 버튼
# simDemoBtn0/1/2가 각각 이 배열의 0/1/2번 항목을 사용한다.
DEMO_QUERIES = [
    "인증 토큰 관련해서 궁금한 게 있어요",
    "로그인 처리 어떻게 되어 있나요",
    "이 부분 예전에 누가 담당했는지 알 수 있나요",
]


def main():
    if not SEEDS_PATH.exists():
        print(
            f"[build_embeddings] 시드 파일이 없습니다: {SEEDS_PATH}",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(SEEDS_PATH, encoding="utf-8") as f:
        seeds = json.load(f)

    print(f"[build_embeddings] 시드 {len(seeds)}건 로드, 모델 {MODEL_NAME} 로딩 중...")
    model = SentenceTransformer(MODEL_NAME)

    questions = [item["q"] for item in seeds]
    vectors = model.encode(questions, normalize_embeddings=False, show_progress_bar=True)

    embeddings = []
    for item, vec in zip(seeds, vectors):
        embeddings.append(
            {
                "id": item["id"],
                "intent": item["intent"],
                "q": item["q"],
                "a": item["a"],
                "author": item["author"],
                "dept": item["dept"],
                "date": item["date"],
                "vec": vec.tolist(),
            }
        )

    EMBEDDINGS_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(EMBEDDINGS_OUT, "w", encoding="utf-8") as f:
        json.dump(embeddings, f, ensure_ascii=False)
    print(f"[build_embeddings] {EMBEDDINGS_OUT} 작성 완료 ({len(embeddings)}건)")

    demo_vectors = model.encode(
        DEMO_QUERIES, normalize_embeddings=False, show_progress_bar=True
    )
    demo_queries = [
        {"q": q, "vec": vec.tolist()} for q, vec in zip(DEMO_QUERIES, demo_vectors)
    ]
    with open(DEMO_QUERIES_OUT, "w", encoding="utf-8") as f:
        json.dump(demo_queries, f, ensure_ascii=False)
    print(f"[build_embeddings] {DEMO_QUERIES_OUT} 작성 완료 ({len(demo_queries)}건)")


if __name__ == "__main__":
    main()
