"""
GyaanSetu AI — Career Router
Resume parsing, skill gap analysis, and AI roadmap generation.
"""

import json, uuid, logging, datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services import ollama_service, ocr_service
from db.database import get_connection

router = APIRouter()
logger = logging.getLogger("gyaansetu.career")


class RoadmapRequest(BaseModel):
    target_title: str
    current_skills: list[str] = []
    user_id: str = "demo-user-aarav"
    language: str = "English"


CAREER_SYSTEM_PROMPT = """
You are a senior career counsellor specializing in the Indian tech and education ecosystem.
When generating career roadmaps, return a JSON object with this exact structure:
{
  "title": "Career Title",
  "match_score": 88,
  "salary_range": "₹X LPA - ₹Y LPA",
  "demand_trend": "+X% YoY",
  "skill_gaps": [
    {"name": "Skill Name", "status": "Missing", "priority": "High"}
  ],
  "roadmap": [
    {
      "phase_num": 1,
      "phase_title": "Foundations + Core learning",
      "duration_months": "Months 1–2",
      "months": [
        {
          "month_num": 1,
          "month_title": "Absolute basics",
          "tracks": [
            {
              "track_title": "Python & Maths basics",
              "topics": ["Syntax & loops", "NumPy", "Pandas", "Linear algebra", "Stats & probability"]
            },
            {
              "track_title": "Web fundamentals",
              "topics": ["HTML & CSS", "JavaScript basics", "Git & GitHub"]
            }
          ],
          "milestones": ["Python fluent", "First React app"]
        }
      ]
    }
  ],
  "pace_guide": "This plan requires 15-20 hrs/week of focused learning — roughly double the original pace. Pick 2-3 tracks that match your primary goal and go deep.",
  "recommended_projects": ["Project 1", "Project 2"],
  "interview_prep": ["Topic 1", "Topic 2"]
}
Respond with ONLY the JSON object, no other text.
"""


@router.post("/generate-roadmap")
async def generate_roadmap(req: RoadmapRequest):
    """Generate a personalized career roadmap using Ollama."""
    skills_text = ", ".join(req.current_skills) if req.current_skills else "not specified"

    prompt = (
        f"Generate a detailed multi-phase career roadmap for: {req.target_title}\n"
        f"Current skills: {skills_text}\n"
        f"Target market: India\n"
        f"Language preference: {req.language}\n\n"
        f"Provide a realistic 6-month roadmap divided into 3-4 phases, with 1-2 months per phase. "
        f"For each month, provide 3-5 parallel tracks (columns) with specific bullet-point topics, "
        f"along with key milestone achievements. Ensure all properties match the JSON structure exactly."
    )

    raw = await ollama_service.complete(
        prompt=prompt,
        task="career",
        system=CAREER_SYSTEM_PROMPT,
        max_tokens=4000,
    )

    # Parse JSON from response
    roadmap_data = _parse_json_response(raw)
    if not roadmap_data:
        # Fallback structure if JSON parsing fails
        roadmap_data = _build_fallback_roadmap(req.target_title, req.current_skills)

    # Save to SQLite
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO career_roadmaps (id, user_id, target_title, match_score, roadmap_json, skills_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                req.user_id,
                req.target_title,
                roadmap_data.get("match_score", 80),
                json.dumps(roadmap_data.get("roadmap", [])),
                json.dumps(roadmap_data.get("skill_gaps", [])),
            )
        )
        conn.commit()
    finally:
        conn.close()

    return roadmap_data


@router.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    target_role: str = "Software Engineer",
    user_id: str = "demo-user-aarav",
):
    """Parse uploaded resume PDF → extract skills → generate gap analysis."""
    file_bytes = await file.read()
    filename = file.filename or "resume.pdf"

    if filename.lower().endswith(".pdf"):
        extract = await ocr_service.extract_from_pdf(file_bytes)
    else:
        extract = {"text": file_bytes.decode("utf-8", errors="ignore")}

    resume_text = extract.get("text", "").strip()
    if not resume_text:
        raise HTTPException(status_code=422, detail="Could not extract text from resume")

    prompt = (
        f"Analyze this student resume for a {target_role} position in India:\n\n"
        f"{resume_text[:3000]}\n\n"
        f"Identify: current skills, missing skills, experience gaps, and recommended next steps. "
        f"Format as a JSON roadmap object."
    )

    raw = await ollama_service.complete(
        prompt=prompt,
        task="career",
        system=CAREER_SYSTEM_PROMPT,
        max_tokens=2000,
    )

    analysis = _parse_json_response(raw)
    if not analysis:
        analysis = _build_fallback_roadmap(target_role, [])
    analysis["resume_parsed"] = True

    return analysis


@router.get("/sectors")
async def get_sectors():
    """Static sector data with salary and role info."""
    return {
        "sectors": [
            {"title": "Software Engineering", "tag": "Hot", "salary_in": "₹14-35 LPA",
             "salary_us": "$120-180k", "trend": "+22%",
             "roles": ["Systems Engineer", "Mobile Lead", "Full-Stack Dev"]},
            {"title": "AI & Machine Learning", "tag": "Trending", "salary_in": "₹18-50 LPA",
             "salary_us": "$150-220k", "trend": "+38%",
             "roles": ["NLP Engineer", "MLOps Engineer", "AI Researcher"]},
            {"title": "Cybersecurity", "tag": "High Demand", "salary_in": "₹15-40 LPA",
             "salary_us": "$130-190k", "trend": "+31%",
             "roles": ["Pen Tester", "SecOps Architect", "Cloud Security"]},
            {"title": "Data Science", "tag": "Stable", "salary_in": "₹12-30 LPA",
             "salary_us": "$115-160k", "trend": "+15%",
             "roles": ["Data Engineer", "Analytics Lead", "Quant Analyst"]},
            {"title": "Medical (NEET)", "tag": "Competitive", "salary_in": "₹15-80 LPA",
             "salary_us": "$200-400k", "trend": "+8%",
             "roles": ["Surgeon", "Radiologist", "Clinical Analyst"]},
            {"title": "UPSC & Govt Exams", "tag": "Civil Service", "salary_in": "₹8-20 LPA",
             "salary_us": "N/A", "trend": "Stable",
             "roles": ["IAS", "IPS", "IFS Officer"]},
            {"title": "Product Management", "tag": "Growing", "salary_in": "₹18-45 LPA",
             "salary_us": "$140-200k", "trend": "+25%",
             "roles": ["PM", "Strategy Lead", "Growth Manager"]},
            {"title": "MBA & Finance", "tag": "Evergreen", "salary_in": "₹12-50 LPA",
             "salary_us": "$120-250k", "trend": "+12%",
             "roles": ["Investment Banker", "CFO", "Consultant"]},
        ]
    }


def _parse_json_response(raw: str) -> dict | None:
    """Try to extract a JSON object from Ollama's raw response."""
    try:
        # Try direct parse
        return json.loads(raw)
    except Exception:
        pass
    # Try extracting between ```json and ```
    import re
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Try finding first { ... } block
    match = re.search(r'\{[\s\S]+\}', raw)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None


def _build_fallback_roadmap(title: str, skills: list[str]) -> dict:
    return {
        "title": title,
        "match_score": 82,
        "salary_range": "₹12-25 LPA",
        "demand_trend": "+20% YoY",
        "skill_gaps": [
            {"name": "System Design", "status": "Missing", "priority": "High"},
            {"name": "Cloud Deployment", "status": "Partial", "priority": "Medium"},
        ],
        "roadmap": [
            {
                "phase_num": 1,
                "phase_title": "Foundations & Core Learning",
                "duration_months": "Months 1–2",
                "months": [
                    {
                        "month_num": 1,
                        "month_title": "Absolute Basics",
                        "tracks": [
                            {
                                "track_title": "Fundamentals & Core",
                                "topics": ["Basic concepts", "Environment setup", "Standard syntax"]
                            },
                            {
                                "track_title": "Tools & Environment",
                                "topics": ["Git & GitHub", "CLI Basics", "Editor setup"]
                            }
                        ],
                        "milestones": ["Environment setup completed", "First simple scripts running"]
                    },
                    {
                        "month_num": 2,
                        "month_title": "Intermediate Core",
                        "tracks": [
                            {
                                "track_title": "Core structures",
                                "topics": ["Data handling", "Basic APIs", "Simple databases"]
                            }
                        ],
                        "milestones": ["First working project built"]
                    }
                ]
            },
            {
                "phase_num": 2,
                "phase_title": "Specialization & Depth",
                "duration_months": "Months 3–4",
                "months": [
                    {
                        "month_num": 3,
                        "month_title": "Advanced Topics",
                        "tracks": [
                            {
                                "track_title": "Advanced development",
                                "topics": ["System design basics", "Security controls", "Optimizations"]
                            }
                        ],
                        "milestones": ["Interview ready"]
                    }
                ]
            }
        ],
        "pace_guide": "This plan requires 15-20 hrs/week of focused study. Align your daily schedule to dedicate at least 2-3 hours to core tracks.",
        "recommended_projects": ["Personal Portfolio", "API Integration Project"],
        "interview_prep": ["Data Structures", "System Design Basics"],
    }
