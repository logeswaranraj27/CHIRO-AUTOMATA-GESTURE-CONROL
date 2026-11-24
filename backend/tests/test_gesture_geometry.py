import pytest
import math
from backend.vision.gesture_classifier import GestureClassifier, GestureResult

@pytest.fixture
def classifier():
    return GestureClassifier(confidence_threshold=0.60)

def create_hand(
    wrist=(0.5, 0.8, 0.0),
    thumb=((0.45, 0.7, 0.0), (0.40, 0.62, 0.0), (0.35, 0.58, 0.0), (0.30, 0.55, 0.0)),
    index=((0.45, 0.55, 0.0), (0.45, 0.45, 0.0), (0.45, 0.38, 0.0), (0.45, 0.30, 0.0)),
    middle=((0.50, 0.52, 0.0), (0.50, 0.42, 0.0), (0.50, 0.35, 0.0), (0.50, 0.25, 0.0)),
    ring=((0.55, 0.55, 0.0), (0.55, 0.45, 0.0), (0.55, 0.38, 0.0), (0.55, 0.30, 0.0)),
    pinky=((0.60, 0.58, 0.0), (0.60, 0.50, 0.0), (0.60, 0.44, 0.0), (0.60, 0.38, 0.0))
):
    """Generates 21 landmark points"""
    pts = [wrist]
    pts.extend(thumb)   # 1,2,3,4
    pts.extend(index)   # 5,6,7,8
    pts.extend(middle)  # 9,10,11,12
    pts.extend(ring)    # 13,14,15,16
    pts.extend(pinky)   # 17,18,19,20
    return pts

def test_open_palm_classification(classifier):
    """P: All 5 fingers extended upward away from wrist"""
    hand = create_hand(
        wrist=(0.5, 0.85, 0.0),
        thumb=((0.42, 0.72, 0.0), (0.36, 0.65, 0.0), (0.30, 0.60, 0.0), (0.22, 0.54, 0.0)),
        index=((0.44, 0.55, 0.0), (0.43, 0.44, 0.0), (0.42, 0.35, 0.0), (0.41, 0.22, 0.0)),
        middle=((0.50, 0.52, 0.0), (0.50, 0.40, 0.0), (0.50, 0.30, 0.0), (0.50, 0.18, 0.0)),
        ring=((0.56, 0.55, 0.0), (0.57, 0.44, 0.0), (0.58, 0.35, 0.0), (0.59, 0.22, 0.0)),
        pinky=((0.62, 0.58, 0.0), (0.64, 0.48, 0.0), (0.66, 0.40, 0.0), (0.68, 0.28, 0.0))
    )
    res = classifier.classify(hand)
    assert res.gesture == "P"
    assert res.name == "Open Palm"
    assert res.confidence >= 0.70

def test_closed_fist_classification(classifier):
    """F: All fingers folded tightly toward palm"""
    hand = create_hand(
        wrist=(0.5, 0.80, 0.0),
        # Thumb folded across fingers
        thumb=((0.45, 0.72, 0.0), (0.42, 0.68, 0.0), (0.44, 0.64, 0.0), (0.46, 0.62, 0.0)),
        # Fingertips curled into palm (closer to wrist than PIP/MCP)
        index=((0.45, 0.60, 0.0), (0.45, 0.52, 0.0), (0.47, 0.58, 0.0), (0.47, 0.64, 0.0)),
        middle=((0.50, 0.58, 0.0), (0.50, 0.50, 0.0), (0.51, 0.56, 0.0), (0.51, 0.62, 0.0)),
        ring=((0.55, 0.60, 0.0), (0.55, 0.52, 0.0), (0.54, 0.58, 0.0), (0.54, 0.64, 0.0)),
        pinky=((0.60, 0.62, 0.0), (0.60, 0.56, 0.0), (0.58, 0.61, 0.0), (0.57, 0.66, 0.0))
    )
    res = classifier.classify(hand)
    assert res.gesture == "F"
    assert res.name == "Closed Fist"
    assert res.confidence >= 0.70

def test_peace_sign_classification(classifier):
    """V: Index & Middle extended with separation, Ring & Pinky folded"""
    hand = create_hand(
        wrist=(0.5, 0.85, 0.0),
        thumb=((0.45, 0.75, 0.0), (0.43, 0.70, 0.0), (0.46, 0.67, 0.0), (0.48, 0.65, 0.0)),
        index=((0.45, 0.55, 0.0), (0.42, 0.42, 0.0), (0.39, 0.32, 0.0), (0.35, 0.20, 0.0)),
        middle=((0.52, 0.52, 0.0), (0.55, 0.40, 0.0), (0.58, 0.30, 0.0), (0.62, 0.18, 0.0)),
        ring=((0.56, 0.60, 0.0), (0.56, 0.52, 0.0), (0.55, 0.58, 0.0), (0.54, 0.65, 0.0)),
        pinky=((0.61, 0.62, 0.0), (0.61, 0.56, 0.0), (0.59, 0.61, 0.0), (0.58, 0.67, 0.0))
    )
    res = classifier.classify(hand)
    assert res.gesture == "V"
    assert res.name == "Peace Sign"
    assert res.confidence >= 0.70

def test_thumbs_up_classification(classifier):
    """T: Thumb extended upward, all 4 fingers folded"""
    hand = create_hand(
        wrist=(0.5, 0.85, 0.0),
        # Thumb pointing straight upward (y decreasing)
        thumb=((0.44, 0.75, 0.0), (0.42, 0.62, 0.0), (0.41, 0.50, 0.0), (0.40, 0.35, 0.0)),
        # 4 fingers tightly curled into fist
        index=((0.47, 0.68, 0.0), (0.48, 0.60, 0.0), (0.51, 0.65, 0.0), (0.51, 0.70, 0.0)),
        middle=((0.52, 0.67, 0.0), (0.53, 0.59, 0.0), (0.55, 0.64, 0.0), (0.55, 0.69, 0.0)),
        ring=((0.57, 0.68, 0.0), (0.58, 0.61, 0.0), (0.59, 0.66, 0.0), (0.59, 0.71, 0.0)),
        pinky=((0.62, 0.70, 0.0), (0.62, 0.65, 0.0), (0.61, 0.69, 0.0), (0.60, 0.73, 0.0))
    )
    res = classifier.classify(hand)
    assert res.gesture == "T"
    assert res.name == "Thumbs Up"
    assert res.confidence >= 0.70

def test_l_shape_classification(classifier):
    """L: Thumb extended sideways/orthogonal, Index extended upward, others folded"""
    hand = create_hand(
        wrist=(0.5, 0.85, 0.0),
        # Thumb extended horizontally to the left
        thumb=((0.42, 0.72, 0.0), (0.35, 0.70, 0.0), (0.28, 0.70, 0.0), (0.20, 0.70, 0.0)),
        # Index extended straight upward
        index=((0.48, 0.55, 0.0), (0.48, 0.42, 0.0), (0.48, 0.32, 0.0), (0.48, 0.20, 0.0)),
        # Others curled into fist
        middle=((0.53, 0.60, 0.0), (0.54, 0.52, 0.0), (0.55, 0.58, 0.0), (0.55, 0.65, 0.0)),
        ring=((0.58, 0.62, 0.0), (0.59, 0.55, 0.0), (0.59, 0.61, 0.0), (0.58, 0.67, 0.0)),
        pinky=((0.63, 0.64, 0.0), (0.63, 0.59, 0.0), (0.62, 0.64, 0.0), (0.61, 0.69, 0.0))
    )
    res = classifier.classify(hand)
    assert res.gesture == "L"
    assert res.name == "L-Shape"
    assert res.confidence >= 0.70

def test_empty_or_uncertain_landmarks(classifier):
    """Missing or insufficient landmarks produce neutral/None"""
    res1 = classifier.classify([])
    assert res1.gesture is None
    res2 = classifier.classify([(0.1, 0.1, 0.1)] * 10) # Less than 21
    assert res2.gesture is None

