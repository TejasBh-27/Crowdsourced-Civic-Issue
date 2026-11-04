"""
nlp_module.py — Real NLP Department Classifier

Uses scikit-learn TF-IDF + Logistic Regression trained on ~360 synthetic
civic complaint descriptions (60 per department × 6 departments).

Pipeline:
  raw text  →  TfidfVectorizer (1-2 ngrams, 3000 features)
            →  LogisticRegression (multi-class, C=1.0, max_iter=1000)
            →  { department, confidence, top_features }
"""

import re
import pathlib
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

MODEL_PATH = pathlib.Path(__file__).parent / "models" / "nlp_pipeline.joblib"

# ─────────────────────────────────────────────────────────────────────────────
# Training corpus — 60 samples per department (realistic civic complaint text)
# ─────────────────────────────────────────────────────────────────────────────

DEPARTMENT_MAP = {
    "roads":      "Roads & Infrastructure",
    "sanitation": "Sanitation & Solid Waste",
    "water":      "Jal Board Water Supply",
    "electrical": "Electrical Grid Maintenance",
    "drainage":   "Drainage & Sewage",
    "traffic":    "Traffic & Transit",
}

TRAINING_DATA = {
    "roads": [
        "large pothole on main road causing accidents",
        "deep crater in road surface near school gate",
        "road has broken asphalt and dangerous potholes",
        "damaged road surface with multiple potholes near market",
        "road full of potholes slowing traffic and damaging vehicles",
        "broken road pavement causing injuries to cyclists",
        "massive pothole near bus stop flooded with water",
        "road collapse due to heavy rain and poor maintenance",
        "severe road damage on highway stretch after monsoon",
        "pothole causing daily accidents near residential area",
        "road surface completely worn out near junction",
        "cracked road with exposed stones near footpath",
        "broken road median causing dangerous traffic",
        "road has not been repaired since six months",
        "sinkhole developing in middle of main road",
        "road pavement broken causing bike accidents",
        "large pothole on lane 4 filled with muddy water",
        "road damage after pipeline repair work not fixed",
        "construction debris left on road causing accidents",
        "speed bump broken and causing vehicle damage",
        "road divider damaged and needs immediate repair",
        "road shoulder collapsed and needs reconstruction",
        "flyover approach road has severe bumps and cracks",
        "road markings completely faded causing confusion",
        "road near school is in deplorable condition",
        "pot holes everywhere on the colony road",
        "road has been dug up and left without repair",
        "multiple road accidents due to pothole near hospital",
        "service road full of gravel and loose stones",
        "junction road is flooded with potholes",
        "main road asphalt patchy and uneven causing issues",
        "road near park covered in loose asphalt causing trips",
        "road dug up for water line never repaired",
        "footpath and road edge collapsed needs urgent repair",
        "public road riddled with holes causing vehicle damage",
        "road surface broken near traffic signal creating jam",
        "deep pothole causing motorbike accident near school",
        "road repair work done badly and holes reappeared",
        "entire stretch of road broken and unmaintained",
        "road under construction but no work happening for months",
        "road near temple has large pothole and is dangerous",
        "broken culvert on side road causing flooding",
        "road surface has cracks and needs resurfacing",
        "concrete road has broken pieces near college",
        "road leading to hospital full of potholes",
        "approach road to metro station broken",
        "pothole swallowed a scooty near market area",
        "dangerous road surface near children playground",
        "roads not repaired after last monsoon",
        "main arterial road damaged by heavy vehicles",
        "broken tarmac road making driving difficult",
        "road has depression causing water to pool",
        "road needs urgent patching before monsoon",
        "unpaved road becoming muddy and impassable",
        "bitumen layer peeling off the road",
        "road near metro has severe cracks",
        "pavement quality very poor on this road",
        "road needs complete relaying it is too old",
        "footpath encroachment making road narrow and dangerous",
        "road slope is wrong water not draining properly",
    ],
    "sanitation": [
        "overflowing garbage bin on main street smelling badly",
        "garbage not collected for a week causing smell",
        "waste dump on footpath near market area",
        "illegal garbage dumping near residential colony",
        "stray dogs scattering garbage from broken bin",
        "garbage collection vehicle not coming to our area",
        "municipal bin overflowing with uncollected waste",
        "foul smell from garbage pile near school",
        "household garbage dumped on public road",
        "garbage heap near park attracting insects and rodents",
        "solid waste management failure in sector 14",
        "rubbish pile near temple not cleared for days",
        "trash accumulation causing health hazard near hospital",
        "uncollected garbage near bus stop",
        "dump yard overflowing into nearby road",
        "waste scattered after garbage truck missed our lane",
        "dead animals not removed from road",
        "wet waste smell from overloaded bin",
        "garbage truck schedule not followed in colony",
        "plastic waste pile blocking the footpath",
        "construction debris mixed with household garbage dumped",
        "biomedical waste found in public garbage bin",
        "residential area waste not cleared for 5 days",
        "garbage burning causing air pollution near houses",
        "public toilet waste overflowing outside premises",
        "dumpsite near school is a health hazard for children",
        "garbage accumulated near water tank",
        "neighbourhood garbage collection point is full",
        "sweeper not coming to clean our lane",
        "garbage piled near drain causing blockage",
        "municipal worker not sweeping the lane",
        "animal carcass lying on road needs removal",
        "bulk waste items not collected by municipal truck",
        "garbage strewn across footpath near market",
        "rubbish accumulated near children park",
        "broken bins spilling waste on road",
        "community garbage point not cleaned",
        "residential waste not collected on festival days",
        "smell from rotting garbage unbearable",
        "rag pickers leaving garbage scattered on roads",
        "public dustbin overflowing and needs replacement",
        "garbage dump is near drainage causing contamination",
        "waste pile fire creating smoke near houses",
        "open defecation area not cleaned",
        "garbage collection stopped since last month",
        "building renovation waste not collected",
        "organic waste composting area overflowing",
        "waste not segregated by collectors causing mess",
        "garbage van not reaching end of the street",
        "sanitation workers on strike affecting waste collection",
        "food waste stall disposal creating mess",
        "garbage flies creating nuisance near residences",
        "dustbin damaged and waste spreading",
        "area behind colony wall used as dump",
        "garbage collector asking for bribe",
        "uncleared garbage making residents sick",
        "neighbourhood drain clogged with garbage",
        "community hall bins overflowing after event",
        "garden waste mixed with household waste and uncollected",
        "stench from nearby garbage site",
    ],
    "water": [
        "water pipe burst on road causing flooding",
        "leaking water pipeline wasting water",
        "no water supply for two days in colony",
        "water pressure very low in our building",
        "muddy water coming from tap",
        "water supply pipeline leaking near school",
        "water main burst causing road flooding",
        "contaminated water supply in our area",
        "water meter damaged and needs replacement",
        "water connection pipe broken at junction",
        "sewage water mixing with drinking water supply",
        "water supply disrupted without any notice",
        "underground water pipe leaking into road",
        "water tanker not coming to our area",
        "overhead water tank has crack and leaking",
        "borewell water has foul smell",
        "water connection line damaged by construction",
        "water supply line broken near society gate",
        "water leakage from municipality pipe near school",
        "pipeline under road leaking water for weeks",
        "our area has no water supply since four days",
        "burst water main flooding the street",
        "water supply cut without advance notice",
        "drinking water quality very poor and smells bad",
        "water pump not working in our building",
        "water connection pending approval for months",
        "water supply timing irregular and insufficient",
        "illegal water connection found near our area",
        "water pressure fluctuates causing appliance damage",
        "jal board water pipe broken near market",
        "water seepage from ground breaking road",
        "private water tanker charging too much",
        "municipality water supply only one hour per day",
        "water wastage from broken hydrant",
        "pipe fitting loose and water dripping",
        "valve box broken exposing water line",
        "water supply contaminated after road digging",
        "chronic water shortage in summer months",
        "overhead tank low capacity causing shortage",
        "water supply meter reading incorrect",
        "water pipe corroded causing rust in supply",
        "water seeping into nearby plot causing damage",
        "water supply not restored after repair work",
        "drinking water pump station not maintained",
        "water distribution unequal across colony",
        "water pipeline running through open area needs protection",
        "colony water storage tank dirty and needs cleaning",
        "water line broken by encroachment",
        "new residential block has no water connection",
        "water supply point shifted without informing residents",
        "underground water pipe causing road humps",
        "water leakage near electrical transformer danger",
        "old cast iron pipe leaking and needs replacement",
        "rooftop water tank overflowing wasting supply",
        "water supply meter not reset correctly",
        "junction water supply valve stuck open",
        "water supply pipe at road crossing broken",
        "water connection illegally tapped near our plot",
        "water quality test failed multiple times",
        "water pressure dropping every morning",
    ],
    "electrical": [
        "streetlight not working on main road",
        "electric pole damaged leaning dangerously",
        "exposed live wire near school gate",
        "power outage for 12 hours no response",
        "transformer burnt causing electricity failure",
        "street light flickering and causing accidents",
        "high tension wire fallen on road",
        "electric meter burnt needs replacement",
        "power supply irregular causing appliance damage",
        "electric pole installed blocking road visibility",
        "live wire hanging low near bus stop",
        "power cut not restored despite complaints",
        "public light pole damaged after accident",
        "illegal electricity connections overloading grid",
        "streetlights not working near school at night",
        "faulty electricity meter overbilling residents",
        "power supply failure affecting water supply pump",
        "electric wires dangling over road",
        "distribution box sparking near residential area",
        "electricity connections to traffic light not working",
        "dark street due to non-functional lights",
        "electric pole wire sagging dangerously low",
        "streetlight column rusted and needs replacement",
        "substation issue causing area wide power failure",
        "temporary electricity connections unsafe",
        "power theft causing voltage fluctuation",
        "street lighting in park not working",
        "underground cable exposed causing shock risk",
        "electric junction box open in public area",
        "light pole knocked down by vehicle not replaced",
        "electricity feeder line weak causing daily outage",
        "single phasing problem affecting motors",
        "burnt transformer affecting 500 households",
        "no electricity for three days after storm",
        "meter reader not visiting causing estimated bills",
        "fluorescent street tube broken and needs replacement",
        "LED streetlight solar panel dirty not working",
        "high tension wire too close to residential building",
        "new electricity connection pending for months",
        "electricity overload tripping daily",
        "road light not working near hospital entrance",
        "wire crossing road at low height dangerous",
        "electric shock from metal gate due to stray current",
        "power supply earthing problem causing shocks",
        "junction box not maintained properly causing fires",
        "no lighting near footpath making it dangerous",
        "electricity bill cycle issue needs correction",
        "electricity connection disconnected by mistake",
        "electric pole being used for banner advertising",
        "streetlight shining into residential windows",
        "electricity transformer humming loudly at night",
        "all streetlights on our lane have been dark for weeks",
        "electric pole very old and needs replacement",
        "birds nest causing electrical short circuit",
        "power cable lying on wet road is dangerous",
        "traffic signal electricity failure causing jams",
        "generator exhaust near electricity panel fire risk",
        "dark underpass due to light failure",
        "street lighting schedule not maintained",
        "electricity theft pole tapping causing danger",
    ],
    "drainage": [
        "drain clogged causing road flooding",
        "sewage overflowing on main street",
        "blocked drain causing water logging after rain",
        "drainage channel full of garbage and mud",
        "sewer overflow near residential colony",
        "storm drain blocked causing flash flood",
        "drainage manhole cover missing danger",
        "open drain near school hazardous for children",
        "sewage spilling onto road from broken pipe",
        "drainage system not maintained causing flooding",
        "waterlogging in entire colony after rain",
        "storm water drain clogged with leaves and debris",
        "sewage line overflowing near park",
        "drainage problem flooding basement parking",
        "open nala near houses causes disease",
        "blocked culvert causing road to flood",
        "low lying area has chronic flooding issue",
        "drain needs desilting urgently before monsoon",
        "sewage pump not working causing overflow",
        "large nala flowing near residential area is open",
        "rainwater harvesting drain blocked",
        "drain water entering homes during heavy rain",
        "sewage treatment plant overflow affecting locality",
        "manhole open and uncovered dangerous for vehicles",
        "drainage not connected to main sewage line",
        "drain has dead animals and garbage in it",
        "water logging on road for days after rain stopped",
        "open sewer near footpath causing disease risk",
        "sewage line choked in entire block",
        "drainage near market clogged with food waste",
        "roadside drain too narrow causing overflow",
        "stormwater drain covered by road expansion",
        "drain overflow damaging houses in low area",
        "drainage canal collapsed causing road damage",
        "sump pump failed causing flooding in basement",
        "industrial waste going into storm drain illegally",
        "drain outlet blocked near railway line",
        "sewage smell from road drain near food stalls",
        "no drainage system in newly developed colony",
        "household drainage pipe connected illegally",
        "underground drain broken causing road sinkhole",
        "drainage water stagnating causing mosquito breeding",
        "drain not deep enough causing overflow",
        "drain needs grille to prevent children falling",
        "sewage mixed with stormwater drainage",
        "drainage channel encroached by construction",
        "drain water backup into kitchen during rain",
        "flood gate at drain not operational",
        "rainwater pipe from building blocking public drain",
        "drain slab broken and missing near school",
        "sewage smell from closed drain near hospital",
        "community sewer pipe leaking underground",
        "drain overflow during monsoon destroying road",
        "catch pit near drain full of mud",
        "effluent from factory entering residential drain",
        "outfall drain blocked causing pond formation",
        "road floods every monsoon due to poor drainage",
        "underground drainage line burst near apartment",
        "drain not cleaned since last monsoon",
        "sewage pump house vandalised and not working",
    ],
    "traffic": [
        "illegal parking blocking emergency vehicle access",
        "cars parked on footpath blocking pedestrians",
        "traffic jam at junction due to no signal",
        "vehicles parked on no parking zone daily",
        "road rage incident at crossing needs attention",
        "traffic signal not working causing accidents",
        "heavy vehicles parking on residential street",
        "trucks blocking road during morning rush hour",
        "parking in front of fire exit is dangerous",
        "no traffic police at busy school crossing",
        "auto rickshaws parked blocking road",
        "illegal taxi stand causing traffic block",
        "motorcycles riding on footpath near market",
        "traffic bottleneck at underpass daily",
        "wrong side driving on main road dangerous",
        "vehicles parked blocking hospital gate",
        "encroachment reducing road width to single lane",
        "hawkers on road causing traffic issues",
        "overspeeding heavy vehicles on residential road",
        "missing road signs causing accidents at junction",
        "no speed breaker near school zone dangerous",
        "potholes and traffic signal failure together causing jam",
        "road block due to construction work during peak hours",
        "no parking lines faded and cars parked anywhere",
        "left turn signal not working at junction",
        "vehicles making U-turn blocking traffic",
        "no road divider causing head on collision risk",
        "commercial vehicles using residential road",
        "accident black spot not addressed by authorities",
        "footpath occupied by vehicles preventing walking",
        "no parking enforcement in market area",
        "three wheelers parked blocking pedestrian crossing",
        "road narrowed due to illegal construction",
        "school bus stopping in wrong place causing jam",
        "road divider removed causing accidents",
        "traffic light camera not working offenders going free",
        "heavy traffic due to road diversion not signed",
        "pavement vendor carts blocking road",
        "trucks unloading on busy street at peak time",
        "parking on footpath blocking access for disabled",
        "rash driving by tipper trucks near school",
        "unmarked speed breaker near junction",
        "signal timing wrong causing long queues",
        "road closed sign missing during construction",
        "goods vehicle double parking on market road",
        "cyclists riding against traffic dangerously",
        "vehicle parking blocking driveway to apartments",
        "no right turn sign missing causing violations",
        "police chowki vacant allowing illegal parking",
        "congestion due to road encroachment by vendors",
        "street corner blocked by parked buses",
        "traffic jams caused by cattle on road",
        "road lane markings completely faded",
        "heavy vehicle breaking road surface repeatedly",
        "unsafe overtaking area needs barrier",
        "road rage incident spot needs security camera",
        "vehicles parking under flyover causing congestion",
        "late night speeding on residential road",
        "no safety measures at road under construction",
        "pedestrian crossing signal not working",
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# Build flat training arrays
# ─────────────────────────────────────────────────────────────────────────────

def _build_training_data():
    X, y = [], []
    for dept_key, samples in TRAINING_DATA.items():
        for text in samples:
            X.append(text)
            y.append(dept_key)
    return X, y


def _preprocess(text: str) -> str:
    """Lowercase, remove punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ─────────────────────────────────────────────────────────────────────────────
# Train / load
# ─────────────────────────────────────────────────────────────────────────────

def train_nlp_pipeline() -> Pipeline:
    """Train TF-IDF + LogisticRegression and return the fitted pipeline."""
    X_raw, y = _build_training_data()
    X = [_preprocess(t) for t in X_raw]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=4000,
            sublinear_tf=True,
            min_df=1,
        )),
        ("clf", LogisticRegression(
            C=1.5,
            max_iter=1000,
            multi_class="multinomial",
            solver="lbfgs",
        )),
    ])
    pipeline.fit(X, y)
    return pipeline


def load_or_train_nlp() -> Pipeline:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    pipeline = train_nlp_pipeline()
    joblib.dump(pipeline, MODEL_PATH)
    print(f"[NLP] Model trained and saved → {MODEL_PATH}")
    return pipeline


# Singleton model loaded once at import time
_nlp_pipeline: Pipeline | None = None

def get_nlp_pipeline() -> Pipeline:
    global _nlp_pipeline
    if _nlp_pipeline is None:
        _nlp_pipeline = load_or_train_nlp()
    return _nlp_pipeline


# ─────────────────────────────────────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────────────────────────────────────

def classify_complaint(title: str, description: str, category_hint: str = "") -> dict:
    """
    Classify complaint text into a department.

    Returns:
        {
            department_key: str,          # e.g. "roads"
            department_label: str,        # e.g. "Roads & Infrastructure"
            confidence: float,            # model probability for top class
            all_probs: dict,              # all department probabilities
            top_features: list[str],      # top TF-IDF terms influencing prediction
            model: str,
        }
    """
    pipeline = get_nlp_pipeline()
    text = _preprocess(f"{title} {description}")

    probs  = pipeline.predict_proba([text])[0]
    labels = pipeline.classes_               # sorted department keys

    top_idx   = int(np.argmax(probs))
    dept_key  = labels[top_idx]
    confidence = float(probs[top_idx])

    # Boost confidence if category_hint matches
    if category_hint and category_hint in labels:
        hint_idx   = list(labels).index(category_hint)
        if hint_idx == top_idx:
            confidence = min(0.99, confidence * 1.10)

    # Top TF-IDF feature names (explanability)
    tfidf       = pipeline.named_steps["tfidf"]
    clf         = pipeline.named_steps["clf"]
    feature_names = np.array(tfidf.get_feature_names_out())
    vec         = tfidf.transform([text]).toarray()[0]
    top_indices = np.argsort(vec)[::-1][:6]
    top_features = [feature_names[i] for i in top_indices if vec[i] > 0]

    return {
        "department_key":   dept_key,
        "department_label": DEPARTMENT_MAP.get(dept_key, dept_key),
        "confidence":       round(confidence, 4),
        "all_probs":        {k: round(float(v), 4) for k, v in zip(labels, probs)},
        "top_features":     top_features,
        "model":            "TF-IDF (1-2 ngram, 4000 feat) + LogisticRegression (sklearn 1.5)",
    }
