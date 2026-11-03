import numpy as np
import cv2
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from math import radians, cos, sin, asin, sqrt
from ai_engine.common.config import GEO_DISTANCE_THRESHOLD_METERS, TIME_DIFF_THRESHOLD_HOURS, IMAGE_SIMILARITY_THRESHOLD
from ai_engine.common.schemas import IncidentReport

class DuplicateDetector:
    """
    Identifies reports that may refer to the same physical civic incident
    using geographic, temporal, categorical, and visual evidence.
    """

    def __init__(self):
        pass

    def _calculate_haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great circle distance between two points in meters."""
        # convert decimal degrees to radians
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

        # haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371000 # Radius of earth in meters.
        return c * r

    def _calculate_image_similarity(self, img_path1: str, img_path2: str) -> float:
        """
        Calculate similarity between two images using structural similarity (SSIM)
        or basic histogram comparison as a lightweight proxy.
        Returns a score between 0.0 and 1.0.
        """
        try:
            img1 = cv2.imread(img_path1)
            img2 = cv2.imread(img_path2)

            if img1 is None or img2 is None:
                return 0.0

            # Resize to common size for comparison
            img1 = cv2.resize(img1, (128, 128))
            img2 = cv2.resize(img2, (128, 128))

            # Using Histogram comparison (Correlation) as a lightweight embedding
            hist1 = cv2.calcHist([img1], [0], None, [256], [0, 256])
            hist2 = cv2.calcHist([img2], [0], None, [256], [0, 256])

            cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
            cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)

            similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
            return max(0.0, similarity)
        except Exception:
            return 0.0

    def _calculate_time_diff_hours(self, ts1: str, ts2: str) -> float:
        """Calculate absolute difference between two ISO timestamps in hours."""
        try:
            fmt = "%Y-%m-%dT%H:%M:%S" # Standard ISO format
            dt1 = datetime.strptime(ts1, fmt)
            dt2 = datetime.strptime(ts2, fmt)
            return abs((dt1 - dt2).total_seconds()) / 3600.0
        except Exception:
            return float('inf')

    def detect_duplicates(self, reports: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyzes a list of reports and groups potential duplicates.

        Args:
            reports: List of report dictionaries containing report_id, image_path,
                     reported_category, latitude, longitude, timestamp.

        Returns:
            List of duplicate groups.
        """
        duplicates = []
        processed_ids = set()

        # Convert reports to a list of objects if they aren't already
        # (Assuming they might be dicts for flexibility)

        for i in range(len(reports)):
            r1 = reports[i]
            id1 = r1.get("report_id")
            if id1 in processed_ids:
                continue

            current_group = {"report_ids": [id1], "evidence": [], "recommendation": "unique"}

            for j in range(i + 1, len(reports)):
                r2 = reports[j]
                id2 = r2.get("report_id")
                if id2 in processed_ids:
                    continue

                # 1. Category Match (Hard filter)
                if r1.get("reported_category") != r2.get("reported_category"):
                    continue

                # 2. Geographic Proximity
                dist = float('inf')
                if all(k in r1 and k in r2 for k in ["latitude", "longitude"]):
                    dist = self._calculate_haversine_distance(
                        r1["latitude"], r1["longitude"],
                        r2["latitude"], r2["longitude"]
                    )

                # 3. Temporal Proximity
                t_diff = self._calculate_time_diff_hours(
                    r1.get("timestamp", ""), r2.get("timestamp", "")
                )

                # 4. Visual Similarity
                sim = 0.0
                if r1.get("image_path") and r2.get("image_path"):
                    sim = self._calculate_image_similarity(
                        r1["image_path"], r2["image_path"]
                    )

                # Scoring Logic
                is_geo_close = dist <= GEO_DISTANCE_THRESHOLD_METERS
                is_time_close = t_diff <= TIME_DIFF_THRESHOLD_HOURS
                is_vis_similar = sim >= IMAGE_SIMILARITY_THRESHOLD

                # Define a "duplicate" as having high coincidence in multiple dimensions
                # High confidence: Geo + Time + (Visual or Category)
                # Medium confidence: Geo + Visual
                # Review: Geo + Time but Visual differs

                if is_geo_close and is_time_close and is_vis_similar:
                    reason = "Strong match: Geo, Time, and Visual similarity."
                    rec = "duplicate"
                    score = 0.9
                elif is_geo_close and is_vis_similar:
                    reason = "Moderate match: Geo and Visual similarity."
                    rec = "duplicate"
                    score = 0.7
                elif is_geo_close and is_time_close:
                    reason = "Possible match: Geo and Time match, but visual evidence is weak."
                    rec = "needs_review"
                    score = 0.4
                else:
                    continue # Not a duplicate

                current_group["report_ids"].append(id2)
                current_group["evidence"].append({
                    "compare_to": id2,
                    "distance": dist,
                    "time_diff": t_diff,
                    "similarity": sim,
                    "reason": reason
                })

                # Upgrade group recommendation if any match is high confidence
                if rec == "duplicate":
                    current_group["recommendation"] = "duplicate"
                elif current_group["recommendation"] != "duplicate":
                    current_group["recommendation"] = "needs_review"

                processed_ids.add(id2)

            if len(current_group["report_ids"]) > 1:
                duplicates.append(current_group)
                processed_ids.add(id1)
            else:
                processed_ids.add(id1)

        return duplicates
