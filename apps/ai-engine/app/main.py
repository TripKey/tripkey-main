from fastapi import FastAPI


app = FastAPI(title="TripKey AI Engine")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/ai/parse")
def parse_user_input(req: dict):
    text = req.get("text", "")
    return {"raw": text, "places": ["도톤보리", "유니버셜 스튜디오"]}
