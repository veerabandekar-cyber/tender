"""
Intelligent instrument category classifier for public tenders.
Maps technical tender titles, keywords, and specifications to business instrument categories.
"""
import re

CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    (
        "Analytical Instruments",
        [
            "spectrometer", "spectrophotometer", "mass spectrometer", "mass spec",
            "gdms", "gd-ms", "glow discharge", "icp-ms", "icp ms", "icp-oes", "icpoes",
            "xrf", "xrd", "x-ray fluorescence", "x-ray diffraction",
            "ftir", "ft-ir", "fourier transform", "raman", "fluorometer", "spectroscopy",
            "nmr", "nuclear magnetic resonance", "oes", "elemental analyser", "elemental analyzer",
            "chromatograph", "chromatography", "hplc", "uhplc", "gc-ms", "gcms", "lc-ms", "lcms",
            "gas chromatograph", "liquid chromatograph", "ion chromatograph",
            "ph meter", "conductivity meter", "tds meter", "spectrolytic", "potentiostat"
        ]
    ),
    (
        "Nuclear Safety Devices",
        [
            "radiation", "dosimeter", "dosimetry", "radioactive", "radioactivity",
            "nuclear safety", "geiger", "gamma", "neutron", "dose rate", "survey meter",
            "radiation monitor", "personal dosimeter", "contamination monitor",
            "nuvia", "barc", "igcar", "alpha resources", "nuclear fuel", "glove box"
        ]
    ),
    (
        "Gas Analyser",
        [
            "gas analyser", "gas analyzer", "co2", "oxygen analyser", "o2 analyser",
            "flue gas", "headspace", "gas sensor", "gas detection", "gas chromatography",
            "emission analyser", "combustion gas", "quantek", "trace gas"
        ]
    ),
    (
        "Meterology",
        [
            "microscope", "microscopy", "profilometer", "surface roughness", "surface profiler",
            "topography", "measuring microscope", "3d microscope", "afm", "sem", "tem",
            "scanning electron", "transmission electron", "atomic force", "ellipsometer",
            "mahr", "caliper", "coordinate measuring", "interferometry", "optical profilometer",
            "dimension measurement", "marvision", "marsurf"
        ]
    ),
    (
        "Agro Management",
        [
            "soil moisture", "soil nutrient", "weather station", "tdr", "leaf wetness",
            "npk", "rain gauge", "plant growth", "agro", "chlorophyll", "crop",
            "fieldscout", "spectrum technologies", "soil sensor", "par sensor",
            "spio", "irrigation", "soil temperature"
        ]
    ),
    (
        "Industrial IoT & LoRa Systems",
        [
            "lora", "lorawan", "gateway", "iot sensor", "telemetry", "wireless profiler",
            "data logger", "remote station", "cellular gateway", "wireless node", "specconnect"
        ]
    ),
    (
        "Semiconductor",
        [
            "vacuum", "cryogenic", "turbo pump", "turbomolecular", "chiller",
            "cryostat", "thermal evaporator", "sputtering", "semiconductor",
            "cleanroom", "wafer", "thin film", "deposition", "e-beam", "plasma cleaner",
            "helium leak detector"
        ]
    ),
    (
        "Bio-Medical",
        [
            "biomedical", "bio-medical", "blood analyser", "hematology", "biochemistry",
            "incubator", "centrifuge", "autoclave", "pcr", "real-time pcr", "dna sequencer",
            "elisa", "cell culture", "biosafety", "laminar airflow", "deep freezer",
            "ultra-low freezer", "cryo freezer"
        ]
    ),
    (
        "Consumables",
        [
            "consumables", "torch", "nebulizer", "spray chamber", "crucible", "electrode",
            "certified reference material", "crm", "skimmer cone", "sample cone",
            "quartz tube", "rf coil", "pump tubing", "precision glass", "graphite tube"
        ]
    ),
    (
        "Software Solutions",
        [
            "software", "sales intelligence", "sia", "crm", "sales enablement",
            "lead qualification", "product recommendation", "ai-assisted", "data analytics platform"
        ]
    ),
]


def classify_instrument(title: str, text: str = "") -> str:
    """Classifies a tender into a standardized instrument category based on title and metadata text."""
    combined = f"{title} {text}".lower()

    # Search in order of specificity
    for category, keywords in CATEGORY_KEYWORDS:
        for kw in keywords:
            # Word boundary search for short keywords or regex match
            if " " in kw:
                if kw in combined:
                    return category
            else:
                if re.search(r"\b" + re.escape(kw) + r"\b", combined, re.I):
                    return category

    return "Analytical Instruments"
