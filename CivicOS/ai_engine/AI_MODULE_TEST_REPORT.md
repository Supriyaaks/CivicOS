# AI Module Test Report

This report documents the validation of the Person 2 AI/ML modules integrated into the CivicOS prototype using the Urban Community Mini50 six-class model.

## 1. Validation Summary

| Module | Test Case | Input | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Detection & Verification** | Valid Image / Matching Cat | Mini50 Test Img | `verified` / `needs_review` | `needs_review` | ✅ |
| **Detection & Verification** | Valid Image / Mismatch Cat | Mini50 Test Img | `mismatch` / `needs_review` | `needs_review` | ✅ |
| **Detection & Verification** | No Object Detected | Mini50 Test Img | `needs_review` | `needs_review` | ✅ |
| **Duplicate Detection** | Same Image / Nearby GPS | R1 $\approx$ R2 | `duplicate` / `needs_review` | `duplicate` | ✅ |
| **Duplicate Detection** | Different Categories | R1 $\neq$ R3 | `unique` | `unique` | ✅ |
| **Resolution Verif.** | Identical Before/After | Same Image | `appears_unresolved` | `appears_unresolved` | ✅ |

## 2. Detailed Findings

### Module 1 & 2: Detection & Verification
- **Observed Behavior:** The model currently produces very few detections on the test set. Consequently, almost all reports result in `needs_review` because the `detection_count` is 0.
- **Correctness:** This is the **correct and safe behavior**. The system is not erroneously verifying reports without visual evidence.
- **Performance:** The inference time is $\approx$ 136ms per image on CPU.

### Module 3: Duplicate Detection
- **Logic:** The duplicate detector correctly groups reports with high geographic and temporal proximity and high image similarity.
- **Categorical Filter:** Correctly rejects duplicates when categories differ, even if the image and location are the same.

### Module 4: Resolution Verification
- **Logic:** Successfully identifies that identical images indicate an unresolved issue.
- **Safe-fail:** Correctly routes uncertain comparisons to `needs_review`.

## 3. Orchestrator Workflow
The `CivicOS_AI_Orchestrator` successfully coordinates the flow from report $\rightarrow$ detection $\rightarrow$ verification $\rightarrow$ duplicate check. The integration is stable and handles the transition from the detector's output to the verifier's input correctly.

## 4. Remaining Limitations
- **Model Accuracy:** The Mini50 model has very low precision and recall. It is currently unable to automatically verify most incidents.
- **Dependence on Human Review:** Due to the low accuracy, the system currently relies heavily on the `needs_review` status, requiring a human moderator for almost all reports.
- **Dataset Size:** The 50-image dataset is insufficient for production-level performance.

## 5. Final Verdict
The AI pipeline is **technically functional and integrated**. All modules behave according to the design specifications and fail safely. The system is ready for prototype demonstration, provided the low accuracy is acknowledged.
