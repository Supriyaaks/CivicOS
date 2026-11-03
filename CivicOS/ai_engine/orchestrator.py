from typing import List, Dict, Any, Optional
from ai_engine.detection.detect import IncidentDetector
from ai_engine.verification.verify import IncidentVerifier
from ai_engine.duplicate_detection.detect_duplicates import DuplicateDetector
from ai_engine.resolution.verify_resolution import ResolutionVerifier
from ai_engine.resolution.road_repair_verifier import RoadRepairVerifier
from ai_engine.litter_detection.detector import LitterDetector
from ai_engine.rdd2022_synthetic_detection.detector import RDD2022Detector

class CivicOS_AI_Orchestrator:
    """
    Integration layer that coordinates the four Person 2 AI modules:
    Detection -> Verification -> Duplicate Detection -> Resolution Verification.
    Now includes optional Litter Detection and Road Damage Detection.
    """
    def __init__(self):
        # Initialize the four specialized modules
        self.detector = IncidentDetector()
        self.verifier = IncidentVerifier(detector=self.detector)
        self.duplicate_detector = DuplicateDetector()
        self.resolution_verifier = ResolutionVerifier(detector=self.detector)

        # Initialize the Litter Detector (Optional capability)
        try:
            self.litter_detector = LitterDetector()
        except Exception as e:
            print(f"Warning: Could not initialize LitterDetector: {e}")
            self.litter_detector = None

        # Initialize the RDD Detector (Optional capability)
        try:
            self.rdd_detector = RDD2022Detector()
        except Exception as e:
            print(f"Warning: Could not initialize RDD2022Detector: {e}")
            self.rdd_detector = None

        # Initialize Road Repair & Comparison Verifier
        self.road_repair_verifier = RoadRepairVerifier(
            urban_detector=self.detector,
            rdd_detector=self.rdd_detector
        )

    def process_new_report(self, report: Dict[str, Any], existing_reports: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Workflow for a new citizen incident report.
        """
        image_path = report.get("image_path")
        selected_cat = report.get("reported_category")

        if not image_path or not selected_cat:
            return {"status": "error", "message": "Missing image_path or reported_category"}

        # 1. AI Incident Detection (Main six-class detector)
        detection_results = self.detector.detect(image_path)

        # 1b. Supplementary Litter Detection
        litter_results = None
        if self.litter_detector:
            litter_results = self.litter_detector.detect(image_path)

        # 1c. Supplementary Road Damage Detection
        rdd_results = None
        if self.rdd_detector:
            rdd_results = self.rdd_detector.detect(image_path)

        # 2. AI Incident Verification
        verification_results = self.verifier.verify(image_path, selected_cat)

        # 3. Duplicate Detection
        duplicate_results = []
        if existing_reports:
            # Include the current report in the list for the detector
            all_reports = existing_reports + [report]
            groups = self.duplicate_detector.detect_duplicates(all_reports)
            # Find the group containing the current report
            for group in groups:
                if report.get("report_id") in group["report_ids"]:
                    duplicate_results = group
                    break

        return {
            "report_id": report.get("report_id"),
            "detection": detection_results,
            "litter_detection": litter_results,
            "rdd_detection": rdd_results,
            "verification": verification_results,
            "duplicates": duplicate_results,
            "workflow_status": "processed"
        }

    def process_resolution(self, report_id: str, before_image: str, after_image: str) -> Dict[str, Any]:
        """
        Workflow for verifying if an incident has been resolved.
        """
        result = self.resolution_verifier.verify_resolution(before_image, after_image)
        return {
            "report_id": report_id,
            "resolution": result,
            "workflow_status": "resolution_verified"
        }

    def process_road_repair_verification(
        self,
        report_id: str,
        before_image: str,
        after_image: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        repair_details: Optional[Dict[str, Any]] = None,
        candidate_reports: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Workflow for municipal road repair verification and cross-incident pothole comparison.
        """
        result = self.road_repair_verifier.verify_road_repair(
            before_path=before_image,
            after_path=after_image,
            report_id=report_id,
            latitude=latitude,
            longitude=longitude,
            repair_details=repair_details,
            candidate_reports=candidate_reports
        )
        return {
            "report_id": report_id,
            "verification": result,
            "workflow_status": "road_repair_verified"
        }
