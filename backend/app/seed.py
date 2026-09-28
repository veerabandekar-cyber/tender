import logging
import uuid
import json
from sqlalchemy import select
from app.database import async_session_maker
from app.modules.catalogue.models import ProductCategory, ProductProvider, CatalogueProduct
from app.modules.organizations.models import Organization
from app.modules.discovery.models import SearchKeyword

logger = logging.getLogger(__name__)

CATEGORIES_DATA = [
    {"id": "a4979ce1-ab6e-440d-84c4-02cfe26f8cdc", "name": "Analytical Instruments", "display_order": 1},
    {"id": "bb0eb73f-a2d5-4d0f-ab2c-c7eb18faae5b", "name": "Agro Management", "display_order": 2},
    {"id": "aa227ffd-f1ea-4f6f-b36a-96932c27d511", "name": "Consumables", "display_order": 3},
    {"id": "cb69be6a-8f1f-418f-a22e-11db85df6256", "name": "Nuclear Safety Devices", "display_order": 4},
    {"id": "6b5f4681-43fb-4209-8b99-f7aba1e69a0d", "name": "Gas Analyser", "display_order": 5},
    {"id": "4da8aa8c-0abd-471d-8a1f-06d9bf7d4df5", "name": "Meterology", "display_order": 6},
    {"id": "2a4bbf7a-0caf-46c1-a8be-cf170e9bfaa8", "name": "Semiconductor", "display_order": 7},
    {"id": "f9f32097-b6fc-4ef0-b787-1554c2119033", "name": "Bio-Medical", "display_order": 8},
    {"id": "d1a2b3c4-e5f6-7890-abcd-ef1234567890", "name": "Software Solutions", "display_order": 9},
    {"id": "57c661b5-f9b6-4b31-8781-3ab825b578dd", "name": "Industrial IoT & LoRa Systems", "display_order": 10},
    {"id": "b08bcaf5-ce11-4008-878e-22c0cae7f7a6", "name": "Agro IoT Sensors", "display_order": 11},
]

PROVIDERS_DATA = [
    {"id": "cb82337a-147d-4058-b196-24a79fe6a72d", "name": "Mass Spectrometry Instruments UK", "website_url": "https://www.massint.co.uk", "country": "UK"},
    {"id": "37e47288-8e54-45e1-a124-ec164e528149", "name": "SPIO Denmark", "website_url": "https://spiosystems.com", "country": "Denmark"},
    {"id": "9e4f0d0d-8bec-4cf3-ae81-4cb21811e200", "name": "Spectrum Technologies USA", "website_url": "https://www.specmeters.com", "country": "USA"},
    {"id": "f4c88509-9b1a-43db-b4bd-9e66d79e7bd9", "name": "Alpha Resources USA", "website_url": "https://www.alpharesources.com", "country": "USA"},
    {"id": "5ec70178-f8f7-4907-8589-920a02877986", "name": "Nuvia France /Germany", "website_url": "https://www.nuvia.com", "country": "France"},
    {"id": "8f0b7473-a23d-430e-b5a7-76cfb0265826", "name": "Quantek USA", "website_url": "https://www.quantekinstruments.com", "country": "USA"},
    {"id": "579813e9-7436-4b71-b33d-3bfb1af42010", "name": "Spectrolytic GMBH", "website_url": "https://www.spectrolytic.com", "country": "Germany"},
    {"id": "159be580-ef48-4d94-baa6-ff94d2551648", "name": "Precision Glass Blowing USA", "website_url": "https://www.precisionglassblowing.com", "country": "USA"},
    {"id": "de3412dd-a9fe-4320-972a-0bfef08146a1", "name": "Lumasense USA/Germany", "website_url": "https://www.lumasenseinc.com", "country": "USA"},
    {"id": "5e6e4e79-4c1c-4818-9fc9-b3efafc681ae", "name": "Mahr Germany", "website_url": "https://www.mahr.com", "country": "Germany"},
    {"id": "74e49e04-6440-4538-957c-2a1272c7f511", "name": "ASTTC India", "website_url": "https://www.analyticasofttech.com/", "country": "India"},
]

PRODUCTS_DATA = [
    {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
        "name": "Sales Intelligence Assistance (SIA)",
        "type": "Software Product",
        "category_id": "d1a2b3c4-e5f6-7890-abcd-ef1234567890",
        "provider_id": "74e49e04-6440-4538-957c-2a1272c7f511",
        "image_url": "/product_images/sia-main.png",
        "additional_images": ["/product_images/sia-2.png", "/product_images/sia-3.png", "/product_images/sia-4.png", "/product_images/sia-5.png"],
        "video_url": None,
        "short_description": "AI-assisted sales enablement and product recommendation platform for analytical instrument businesses.",
        "detailed_description": "Sales Intelligence Assistance (SIA) is an AI-assisted sales enablement and product recommendation platform designed for analytical instrument businesses. The platform helps sales teams identify target industries, explore company product portfolios, understand testing requirements, recommend suitable analytical instruments, discover key decision-makers, and initiate contextual outreach. SIA transforms industry knowledge into a structured and repeatable sales workflow, enabling faster instrument recommendation, improved lead qualification, and stronger sales efficiency.",
        "applications": ["Sales Enablement", "Business Development", "Product Recommendation", "Lead Qualification", "Customer Research", "Market Intelligence", "Pre-Sales Support"],
        "industries": ["Pharmaceutical", "Chemical", "FMCG", "Food & Beverage", "Cosmetics", "Petroleum", "Textile", "Steel", "Power", "Research & Academia"],
        "technical_highlights": ["AI-assisted sales enablement platform", "Industry-to-instrument recommendation workflow", "Product-to-testing requirement mapping", "Intelligent instrument recommendation engine", "Leadership and contact intelligence support", "RAG-enabled contextual assistance", "CRM-ready architecture", "Analytics and reporting support"],
        "key_features": ["Sector-based company discovery", "Company product portfolio exploration", "Testing requirement identification", "Instrument recommendation workflow", "AI-assisted sales justification", "Leadership and contact intelligence", "Contextual outreach assistance", "Future CRM integration support"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "0e7fc2cd-a3a4-4bff-b942-83f69becaf3c",
        "name": "Radioactivity & Environment Safety",
        "type": "Safety System",
        "category_id": "cb69be6a-8f1f-418f-a22e-11db85df6256",
        "provider_id": "5ec70178-f8f7-4907-8589-920a02877986",
        "image_url": "/product_images/nuclear.jpg",
        "additional_images": ["/product_images/nuclear-nuvia.jpg"],
        "video_url": None,
        "short_description": "Comprehensive radioactive monitoring and environmental protection systems.",
        "detailed_description": "Nuvia provides comprehensive radioactive monitoring and environmental protection systems designed for nuclear power facilities, environmental monitoring stations, and emergency response applications.",
        "applications": ["Nuclear Power Plant Monitoring", "Environmental Radiation Monitoring", "Emergency Response", "Regulatory Compliance"],
        "industries": ["Nuclear", "Government", "Environmental"],
        "technical_highlights": ["Real-time radiation monitoring", "Environmental protection grade", "Multi-sensor network capability"],
        "key_features": ["Continuous monitoring system", "Regulatory compliance built-in", "Remote data access"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "29d8eb1e-1d96-4a61-977c-b0e161bfa0eb",
        "name": "CO2 Analyser",
        "type": "Gas Sensor",
        "category_id": "6b5f4681-43fb-4209-8b99-f7aba1e69a0d",
        "provider_id": "8f0b7473-a23d-430e-b5a7-76cfb0265826",
        "image_url": "/product_images/gas-co-2.webp",
        "additional_images": ["/product_images/gas-co-2-2.webp"],
        "video_url": None,
        "short_description": "Portable and benchtop CO2 analyzers for oxygen and headspace analysis.",
        "detailed_description": "Quantek analyzers provide fast, accurate, and easy to use CO2 and O2 measurement for Modified Atmosphere Packaging (MAP) and other gas analysis applications.",
        "applications": ["Food Package Testing", "Incubator Monitoring", "Controlled Atmosphere Storage"],
        "industries": ["Food & Beverage", "Pharmaceutical", "Agriculture"],
        "technical_highlights": ["Infrared NDIR sensor", "0.1% resolution", "Internal 12-hour battery"],
        "key_features": ["Large LED display", "Built-in sampling pump", "Rugged metal enclosure"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "ed2d88f9-d1d7-41b6-a6ae-8b1d893f6f4a",
        "name": "3D Microscope",
        "type": "Measuring Microscope",
        "category_id": "4da8aa8c-0abd-471d-8a1f-06d9bf7d4df5",
        "provider_id": "5e6e4e79-4c1c-4818-9fc9-b3efafc681ae",
        "image_url": "/product_images/mahr-microscope-1.png",
        "additional_images": ["/product_images/mahr-microscope-2.png", "/product_images/mahr-micro-3.png"],
        "video_url": None,
        "short_description": "High-precision MarVision MM 500 measuring microscope with zoom lenses for the most minute components.",
        "detailed_description": "Mahr offers the new MarVision MM 500 measuring microscope for the workshop and laboratory in two versions, each with three measuring ranges: with manual axes or with CNC axis control. The system features high-precision measurement of the most minute components using zoom lenses.",
        "applications": ["Micro-component Measurement", "Quality Assurance", "Dimensional Inspection", "Surface Topography"],
        "industries": ["Precision Manufacturing", "Electronics", "Medical Devices", "Aerospace"],
        "technical_highlights": ["Zoom lens technology for minute components", "Manual and CNC axis control options", "Three measuring ranges per version", "Six model configurations available"],
        "key_features": ["MarVision MM 500 platform", "Workshop and laboratory use", "Manual or CNC axis control", "High-precision zoom optics"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "51fce909-064c-49b4-959f-99de432c0ea0",
        "name": "GDMS Glove Adaptable Nuclear",
        "type": "Mass Spectrometer",
        "category_id": "a4979ce1-ab6e-440d-84c4-02cfe26f8cdc",
        "provider_id": "cb82337a-147d-4058-b196-24a79fe6a72d",
        "image_url": "/product_images/gdms-glove-box.jpg",
        "additional_images": ["/product_images/time-resolved-crater.png"],
        "video_url": None,
        "short_description": "Specially adapted GD-MS with front-end assembly designed for custom glove box fitting in nuclear applications.",
        "detailed_description": "The GDMS Glove Adaptable Nuclear is a variant of the GD90 Trace specifically engineered for nuclear glovebox environments. Its front end assembly allows for the fitting of a custom-designed glove box, enabling safe handling and analysis of radioactive and hazardous samples.",
        "applications": ["Nuclear Fuel Characterization", "Hazardous Material Analysis", "Radioactive Sample Testing"],
        "industries": ["Nuclear", "Defence", "Government Labs"],
        "technical_highlights": ["Custom glove box front-end assembly", "Remote operation capability", "Radiation shielded components", "Same analytical performance as GD90 Trace"],
        "key_features": ["Safe handling of radioactive samples", "Full elemental coverage in containment", "USB interface with remote PC control"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "65399788-c25e-4578-911e-99ad5c65e606",
        "name": "Profilometer",
        "type": "Surface Profiler",
        "category_id": "4da8aa8c-0abd-471d-8a1f-06d9bf7d4df5",
        "provider_id": "5e6e4e79-4c1c-4818-9fc9-b3efafc681ae",
        "image_url": "/product_images/mahr-profilometer.png",
        "additional_images": [],
        "video_url": None,
        "short_description": "Optical profilometers for two- and three-dimensional surface measurement and analysis.",
        "detailed_description": "The MarSurf3D CP/CL select is Mahr's established optical profilometry solution for Quality Assurance. These optical profilometers enable two- and three-dimensional measurement and analysis of surfaces.",
        "applications": ["Surface Roughness QA", "Automotive Engine Parts", "Aerospace Components", "Medical Implants"],
        "industries": ["Automotive", "Aerospace", "Medical Devices", "Precision Manufacturing"],
        "technical_highlights": ["Optical non-contact measurement", "2D and 3D surface analysis", "Material-independent measurement", "High-speed data acquisition"],
        "key_features": ["MarSurf3D CP/CL select models", "Established QA-grade profilometry", "Non-contact operation - no sample damage", "Conforms to ISO/JIS standards"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "1f182607-d65a-462d-b8cd-9ee4d585fb4c",
        "name": "Weather Monitoring Station",
        "type": "Environmental Sensor",
        "category_id": "bb0eb73f-a2d5-4d0f-ab2c-c7eb18faae5b",
        "provider_id": "9e4f0d0d-8bec-4cf3-ae81-4cb21811e200",
        "image_url": "/product_images/lora-1.avif",
        "additional_images": ["/product_images/lora-2.avif", "/product_images/lora-3.avif"],
        "video_url": None,
        "short_description": "Complete weather monitoring solutions with wireless profilers and LoRa connectivity for precision agriculture.",
        "detailed_description": "Spectrum Technologies offers comprehensive weather monitoring solutions including profilers for weather stations and LoRa wireless profilers. These systems provide accurate weather data needed for precision agriculture.",
        "applications": ["Crop Disease Forecasting", "Irrigation Scheduling", "Research Plots"],
        "industries": ["Agriculture", "Environmental Science", "Research & Academia"],
        "technical_highlights": ["LoRa wireless connectivity", "Integrated soil and weather profiling", "Solar powered option"],
        "key_features": ["Wireless cellular communication", "Easy installation", "Real-time alerts via app"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "abf8dc65-5527-480b-a186-ba57e24c46c1",
        "name": "Soil Moisture Analyser",
        "type": "Soil Sensor",
        "category_id": "bb0eb73f-a2d5-4d0f-ab2c-c7eb18faae5b",
        "provider_id": "9e4f0d0d-8bec-4cf3-ae81-4cb21811e200",
        "image_url": "/product_images/tdr-150.avif",
        "additional_images": ["/product_images/tdr-250.avif", "/product_images/tdr-350.avif"],
        "video_url": None,
        "short_description": "TDR soil moisture meters for precise measurement of soil moisture content critical for plant health.",
        "detailed_description": "Spectrum Technologies offers the FieldScout TDR series (TDR 150, TDR 250, TDR 350) for precise soil moisture measurement with various rod lengths and accessories including infrared temperature sensors.",
        "applications": ["Soil Moisture Monitoring", "Irrigation Scheduling", "Plant Disease Prevention", "Agricultural Research"],
        "industries": ["Agriculture", "Environmental Science", "Research & Academia"],
        "technical_highlights": ["Time Domain Reflectometry (TDR) technology", "Multiple rod length options (1.5\" to 8.0\")", "Infrared temperature sensor option", "Portable hand-held design"],
        "key_features": ["FieldScout TDR 150/250/350 models", "Carry case included with select models", "Pilot hole maker accessory", "Rod spacer for consistent measurements"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "7c559944-3479-45e7-b9bf-98c4001af97d",
        "name": "Real time IR Analyser",
        "type": "Mid-IR Analyzer",
        "category_id": "a4979ce1-ab6e-440d-84c4-02cfe26f8cdc",
        "provider_id": "579813e9-7436-4b71-b33d-3bfb1af42010",
        "image_url": "/product_images/real-time-ir.jpg",
        "additional_images": ["/product_images/ir-types.jpg"],
        "video_url": None,
        "short_description": "Plug & play inline analyser for real-time, in-situ monitoring of oil and lubricant condition.",
        "detailed_description": "The FluidInspectIR series of plug & play inline analysers provides real-time, in-situ monitoring of oil and lubricant condition for turbines, transformers, engines, and heavy machinery.",
        "applications": ["In-service Oil Condition Monitoring", "Power Generation: Engines, Turbines, Transformers", "Hydraulic & Gear Equipment Monitoring"],
        "industries": ["Power Generation", "Steel & Metals", "Oil & Gas", "Automotive", "Manufacturing"],
        "technical_highlights": ["Mid-IR Spectroscopic measurement", "24/7 real-time data output", "Battery powered portable option", "No sample preparation required"],
        "key_features": ["Plug & play inline installation", "Multiple variants: PLUS, ULTRA, ATEX, DEV, MINI, MIRS-T-V", "Significant cost savings on laboratory analysis"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "dbee3582-4015-4cd8-bcf4-daaae3ce1e8c",
        "name": "KSHAR-06 Conductivity/TDS Meter",
        "type": "Conductivity Meter",
        "category_id": "a4979ce1-ab6e-440d-84c4-02cfe26f8cdc",
        "provider_id": "74e49e04-6440-4538-957c-2a1272c7f511",
        "image_url": "/product_images/conductivity-meter-asttc.png",
        "additional_images": [],
        "video_url": None,
        "short_description": "High-accuracy combined meter for measuring Conductivity and Total Dissolved Solids in laboratory and field samples.",
        "detailed_description": "The KSHAR-06 is a versatile and robust instrument designed by ASTTC India for precise monitoring of water quality. It measures both Conductivity and Total Dissolved Solids (TDS) with exceptional accuracy across a wide range.",
        "applications": ["Water Quality Monitoring", "Boiler & Cooling Tower Water Testing", "Industrial Effluent Analysis", "Agriculture & Hydroponics"],
        "industries": ["Manufacturing", "Environmental", "Agriculture", "Energy & Utilities", "Research & Academia"],
        "technical_highlights": ["Conductivity Range: 0.01 uS/cm to 199.9 mS/cm", "TDS Range: 0.01 mg/L to 1999 mg/L", "Conductivity Accuracy: +-1.0% Full Scale", "Adjustable TDS conversion factor"],
        "key_features": ["Dual mode: Conductivity and TDS measurement", "Digital display with clear resolution", "Rugged construction for industrial environments", "Simple calibration procedure"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "c14b4e7e-64e6-4b5b-bf66-83226d1aefda",
        "name": "CS-ONH Analyser & Consumables",
        "type": "Elemental Analyser",
        "category_id": "aa227ffd-f1ea-4f6f-b36a-96932c27d511",
        "provider_id": "f4c88509-9b1a-43db-b4bd-9e66d79e7bd9",
        "image_url": "/product_images/combustible-consumables.jpg",
        "additional_images": ["/product_images/eltra-header.jpg", "/product_images/tfs-icpmsheader.jpg"],
        "video_url": None,
        "short_description": "OEM-quality combustion consumable supplies and certified reference materials at below OEM prices.",
        "detailed_description": "Alpha Resources manufactures and sources the most comprehensive mix of consumables and certified reference materials offered by any aftermarket supplier in the combustion analysis marketplace.",
        "applications": ["Carbon/Sulfur Analysis", "Oxygen/Nitrogen/Hydrogen Analysis", "Organic Elemental Analysis", "Metallography & Surface Prep"],
        "industries": ["Steel & Metals", "Mining", "Petroleum & Fuels", "Quality Control Labs", "Research & Academia"],
        "technical_highlights": ["Compatible with Bruker, ELTRA, LECO, Horiba, Elementar", "ISO 17025 certified laboratory", "OEM-equivalent quality"],
        "key_features": ["Combustion consumable supplies", "Certified Reference Materials", "Optical Emission Spectroscopy supplies", "ICP-MS sample and skimmer cones"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "f5de8b8d-4826-4434-a4a8-836e63136388",
        "name": "GD-MS Glow Discharge Mass Spectrometer",
        "type": "Mass Spectrometer",
        "category_id": "a4979ce1-ab6e-440d-84c4-02cfe26f8cdc",
        "provider_id": "cb82337a-147d-4058-b196-24a79fe6a72d",
        "image_url": "/product_images/gdms-image.png",
        "additional_images": ["/product_images/conducting-samples.jpg", "/product_images/flat-samples.jpg", "/product_images/powder-samples.jpg"],
        "video_url": None,
        "short_description": "High resolution GD-MS for direct determination of elemental content from major (wt%) to ultra-trace (sub-ppb) within a single scan.",
        "detailed_description": "The GD90 Trace, the GDMS instrument from MSI, features a proven optical platform with innovative modern stable electronics and control. It performs full elemental analysis of major to ultra-trace elements within a single scan using direct solid sampling.",
        "applications": ["Metals & Alloys Purity", "Semiconductor Material Analysis", "Nuclear Fuel Characterization", "High Purity Materials Testing"],
        "industries": ["Nuclear", "Semiconductor", "Metals & Mining", "Aerospace", "Advanced Materials"],
        "technical_highlights": ["Sub-ppb detection limits", "High resolution magnetic sector", "Dual collectors with up to 12 orders dynamic range"],
        "key_features": ["Direct solids analysis - no chemical digestion needed", "Uniform sensitivity", "Minimal matrix effects", "Analyses conductive and non-conductive samples"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "50301fed-a5d3-49b4-bd5f-27b45d2e575d",
        "name": "Personal Radiation Monitoring Watch",
        "type": "Nuclear Safety Device",
        "category_id": "cb69be6a-8f1f-418f-a22e-11db85df6256",
        "provider_id": "74e49e04-6440-4538-957c-2a1272c7f511",
        "image_url": "/product_images/rad-barc-watch.jpg",
        "additional_images": ["/product_images/barc-watch-2.jpeg"],
        "video_url": None,
        "short_description": "Wearable personal dosimeter watch for real-time radiation monitoring and personnel protection in hazardous environments.",
        "detailed_description": "ASTTC's Personal Radiation Monitoring Watch is a cutting-edge wearable safety device designed for professionals working in nuclear facilities, medical imaging, and emergency response.",
        "applications": ["Personal Dose Monitoring", "Nuclear Power Plant Operations", "Medical & Industrial Radiography", "Emergency Response"],
        "industries": ["Nuclear", "Healthcare", "Defense", "Emergency Services", "Research & Academia"],
        "technical_highlights": ["Real-time Gamma and X-ray dose rate measurement", "Cumulative dose tracking", "Audible and visual vibration alarms", "High-sensitivity Geiger-Muller tube"],
        "key_features": ["Compact wearable watch design", "Easy-to-read LCD screen with backlight", "Adjustable alarm thresholds", "Water-resistant and rugged"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    },
    {
        "id": "55263167-aff6-40d5-ae94-574f2603d023",
        "name": "HYDRON Series pH Meter",
        "type": "pH Meter",
        "category_id": "a4979ce1-ab6e-440d-84c4-02cfe26f8cdc",
        "provider_id": "74e49e04-6440-4538-957c-2a1272c7f511",
        "image_url": "/product_images/ph-meter-hydron-8.jpg",
        "additional_images": ["/product_images/ph-hydron-7-front.jpg", "/product_images/ph-meter-hydron-7.jpg"],
        "video_url": None,
        "short_description": "Advanced laboratory pH meter series (HYDRON-07/09) for high-precision measurement of acidity and alkalinity.",
        "detailed_description": "The HYDRON series from ASTTC India offers professional-grade pH measurement solutions for research, quality control, and industrial laboratories.",
        "applications": ["Chemical Analysis & Research", "Quality Control in Manufacturing", "Water & Wastewater Testing", "Food & Beverage Industry"],
        "industries": ["Pharmaceutical", "Chemical", "Environmental", "Food & Beverage", "Research & Academia"],
        "technical_highlights": ["High resolution: 0.01 pH", "Simultaneous pH and temperature display", "Multi-point calibration with buffer recognition"],
        "key_features": ["User-friendly interface", "Durable electrode for long-term stability", "Compact benchtop design", "Standard BNC connector"],
        "test_types": [],
        "price_range": "Price on Request",
        "price_currency": "INR",
        "is_active": True,
        "is_upcoming": False
    }
]

ORGANIZATIONS_DATA = [
    {"name": "Bhabha Atomic Research Centre", "type": "Research Lab", "category": "DAE", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Indira Gandhi Centre for Atomic Research", "type": "Research Lab", "category": "DAE", "city": "Kalpakkam", "state": "Tamil Nadu"},
    {"name": "Tata Institute of Fundamental Research", "type": "Research Lab", "category": "DAE", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Saha Institute of Nuclear Physics", "type": "Research Lab", "category": "DAE", "city": "Kolkata", "state": "West Bengal"},
    {"name": "Indian Institute of Science", "type": "University", "category": "IIT", "city": "Bengaluru", "state": "Karnataka"},
    {"name": "Indian Institute of Technology Bombay", "type": "University", "category": "IIT", "city": "Mumbai", "state": "Maharashtra"},
    {"name": "Indian Institute of Technology Delhi", "type": "University", "category": "IIT", "city": "New Delhi", "state": "Delhi"},
    {"name": "Indian Space Research Organisation", "type": "Government Agency", "category": "Government", "city": "Bengaluru", "state": "Karnataka"},
    {"name": "Council of Scientific and Industrial Research", "type": "Research Council", "category": "Government", "city": "New Delhi", "state": "Delhi"},
]

KEYWORDS_DATA = ["spectrometer", "laser", "vacuum", "cryogenic", "detector", "chromatography", "microscope", "radiation", "sensor", "analyser"]


async def run_seed():
    """Ensure all required initial data exists in the database on startup using ORM models.
    Compatible with SQLite, PostgreSQL, and Cloud databases.
    """
    try:
        async with async_session_maker() as session:
            # 1. Seed Product Categories
            for cat_data in CATEGORIES_DATA:
                cat_id = uuid.UUID(cat_data["id"])
                result = await session.execute(
                    select(ProductCategory).where(ProductCategory.id == cat_id)
                )
                existing = result.scalar_one_or_none()
                if not existing:
                    category = ProductCategory(
                        id=cat_id,
                        name=cat_data["name"],
                        display_order=cat_data["display_order"]
                    )
                    session.add(category)
                else:
                    existing.name = cat_data["name"]
                    existing.display_order = cat_data["display_order"]
            await session.commit()
            logger.info("Product categories seed ensured.")

            # 2. Seed Product Providers
            for prov_data in PROVIDERS_DATA:
                prov_id = uuid.UUID(prov_data["id"])
                result = await session.execute(
                    select(ProductProvider).where(ProductProvider.id == prov_id)
                )
                existing = result.scalar_one_or_none()
                if not existing:
                    provider = ProductProvider(
                        id=prov_id,
                        name=prov_data["name"],
                        website_url=prov_data.get("website_url"),
                        country=prov_data.get("country")
                    )
                    session.add(provider)
                else:
                    existing.name = prov_data["name"]
                    existing.website_url = prov_data.get("website_url")
                    existing.country = prov_data.get("country")
            await session.commit()
            logger.info("Product providers seed ensured.")

            # 3. Seed Catalogue Products (including SIA)
            for prod_data in PRODUCTS_DATA:
                prod_id = uuid.UUID(prod_data["id"])
                result = await session.execute(
                    select(CatalogueProduct).where(CatalogueProduct.id == prod_id)
                )
                existing = result.scalar_one_or_none()
                if not existing:
                    product = CatalogueProduct(
                        id=prod_id,
                        name=prod_data["name"],
                        type=prod_data["type"],
                        category_id=uuid.UUID(prod_data["category_id"]),
                        provider_id=uuid.UUID(prod_data["provider_id"]) if prod_data.get("provider_id") else None,
                        image_url=prod_data.get("image_url"),
                        additional_images=prod_data.get("additional_images", []),
                        video_url=prod_data.get("video_url"),
                        short_description=prod_data.get("short_description"),
                        detailed_description=prod_data.get("detailed_description"),
                        applications=prod_data.get("applications", []),
                        industries=prod_data.get("industries", []),
                        technical_highlights=prod_data.get("technical_highlights", []),
                        key_features=prod_data.get("key_features", []),
                        test_types=prod_data.get("test_types", []),
                        price_range=prod_data.get("price_range", "Price on Request"),
                        price_currency=prod_data.get("price_currency", "INR"),
                        is_active=prod_data.get("is_active", True),
                        is_upcoming=prod_data.get("is_upcoming", False)
                    )
                    session.add(product)
                else:
                    existing.name = prod_data["name"]
                    existing.type = prod_data["type"]
                    existing.category_id = uuid.UUID(prod_data["category_id"])
                    existing.provider_id = uuid.UUID(prod_data["provider_id"]) if prod_data.get("provider_id") else None
                    existing.image_url = prod_data.get("image_url")
                    existing.additional_images = prod_data.get("additional_images", [])
                    existing.short_description = prod_data.get("short_description")
                    existing.detailed_description = prod_data.get("detailed_description")
                    existing.applications = prod_data.get("applications", [])
                    existing.industries = prod_data.get("industries", [])
                    existing.technical_highlights = prod_data.get("technical_highlights", [])
                    existing.key_features = prod_data.get("key_features", [])
                    existing.is_active = prod_data.get("is_active", True)
                    existing.is_upcoming = prod_data.get("is_upcoming", False)
            await session.commit()
            logger.info("Product catalog products seed ensured.")

            # 4. Seed Buyer Organizations
            for org_data in ORGANIZATIONS_DATA:
                result = await session.execute(
                    select(Organization).where(Organization.name == org_data["name"])
                )
                if not result.scalar_one_or_none():
                    org = Organization(**org_data)
                    session.add(org)
            await session.commit()
            logger.info("Buyer organizations seed ensured.")

            # 5. Seed Crawler Search Keywords
            for kw in KEYWORDS_DATA:
                result = await session.execute(
                    select(SearchKeyword).where(SearchKeyword.keyword == kw)
                )
                if not result.scalar_one_or_none():
                    keyword = SearchKeyword(keyword=kw, is_active=True)
                    session.add(keyword)
            await session.commit()
            logger.info("Crawler search keywords seed ensured.")

            # 6. Normalize & Classify Existing Tenders
            from app.modules.tenders.models import Tender
            from app.common.classifier import classify_instrument
            tenders_result = await session.execute(select(Tender))
            existing_tenders = tenders_result.scalars().all()
            classified_count = 0
            for tender in existing_tenders:
                changed = False
                if not tender.instrument_category or tender.instrument_category in {"General", "None", ""}:
                    tender.instrument_category = classify_instrument(tender.title or "", tender.department or "")
                    changed = True
                if tender.tender_number.startswith("NOT-PUBLISHED/") or tender.tender_number.lower().endswith(".pdf") or tender.tender_number.lower().endswith(".html"):
                    portal = tender.portal or "TND"
                    clean_portal = "".join(c for c in portal.upper() if c.isalnum())[:6] or "TND"
                    uid = uuid.uuid4().hex[:8].upper()
                    tender.tender_number = f"{clean_portal}-PUB-{uid}"
                    changed = True
                if changed:
                    classified_count += 1

            if classified_count > 0:
                await session.commit()
                logger.info(f"Classified and normalized {classified_count} existing tender record(s).")

            logger.info("Database seeding completed successfully.")
    except Exception as e:
        logger.error(f"Failed to seed database: {e}", exc_info=True)
