import os
from ai_engine.orchestrator import CivicOS_AI_Orchestrator

def test_resolution():
    orch = CivicOS_AI_Orchestrator()
    test_dir = "ai_engine/datasets/processed/urban_community_mini50/images/test"
    images = sorted([f for f in os.listdir(test_dir) if f.endswith(".jpg")])
    
    if len(images) < 2:
        print("Not enough images for resolution test.")
        return

    # Case 1: No change (Same image)
    img1 = os.path.join(test_dir, images[0])
    res1 = orch.process_resolution("REP_1", img1, img1)
    print(f"Case: Same Image -> Status: {res1['resolution']['status']}")

    # Case 2: Uncertain comparison (Different images)
    img2 = os.path.join(test_dir, images[1])
    res2 = orch.process_resolution("REP_2", img1, img2)
    print(f"Case: Different Images -> Status: {res2['resolution']['status']}")

if __name__ == "__main__":
    test_resolution()
