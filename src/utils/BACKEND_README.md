
# SecureVote Chain - Backend Documentation

This document outlines the Python backend implementation for the facial recognition component of the SecureVote decentralized voting system.

## Technology Stack

- **Python 3.8+**: Core programming language
- **Flask**: Web server for API endpoints
- **OpenCV**: Computer vision library for image processing
- **dlib**: Face detection and facial landmark prediction
- **face_recognition**: Simplified face recognition library
- **Web3.py**: Interaction with Ethereum blockchain

## Installation Requirements

```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install flask opencv-python dlib face_recognition numpy web3 pillow
```

## System Architecture

The backend consists of several microservices:

1. **User Registration Service**: Handles user registration and facial data storage
2. **Face Recognition Service**: Verifies user identity using facial recognition
3. **Blockchain Integration Service**: Connects to Ethereum for vote recording
4. **OTP Generation and Verification Service**: Handles two-factor authentication

## Face Recognition Implementation

The face recognition system follows these steps:

1. **Face Detection**: Detect faces in the input image
2. **Face Alignment**: Align the face based on eye positions
3. **Feature Extraction**: Extract 128-dimension facial embeddings
4. **Similarity Matching**: Compare against stored embeddings
5. **Verification Decision**: Determine if the face matches the registered user

### Sample Code for Face Recognition

```python
import face_recognition
import numpy as np
import cv2
from PIL import Image
import io

def verify_face(registered_face_encoding, image_data):
    # Convert image data to numpy array
    image = Image.open(io.BytesIO(image_data))
    image_np = np.array(image)
    
    # Convert to RGB (face_recognition uses RGB)
    if image_np.shape[2] == 4:  # If RGBA
        image_np = image_np[:, :, :3]
    
    # Detect faces in the image
    face_locations = face_recognition.face_locations(image_np)
    
    if not face_locations:
        return {"status": "error", "message": "No face detected"}
    
    # Get face encodings
    face_encodings = face_recognition.face_encodings(image_np, face_locations)
    
    if not face_encodings:
        return {"status": "error", "message": "Failed to encode face"}
    
    # Compare with registered face
    matches = face_recognition.compare_faces([registered_face_encoding], face_encodings[0])
    face_distance = face_recognition.face_distance([registered_face_encoding], face_encodings[0])
    
    if matches[0] and face_distance[0] < 0.6:  # Threshold can be adjusted
        return {
            "status": "success", 
            "message": "Face verified", 
            "confidence": float(1 - face_distance[0])
        }
    else:
        return {
            "status": "failed", 
            "message": "Face verification failed",
            "confidence": float(1 - face_distance[0])
        }
```

## API Endpoints

### Face Registration

```
POST /api/register-face
Content-Type: multipart/form-data

Parameters:
- user_id: string (required)
- image: file (required)

Response:
{
  "status": "success",
  "message": "Face registered successfully",
  "user_id": "user-123"
}
```

### Face Verification

```
POST /api/verify-face
Content-Type: multipart/form-data

Parameters:
- user_id: string (required)
- image: file (required)

Response:
{
  "status": "success",
  "message": "Face verified",
  "confidence": 0.92
}
```

### OTP Generation

```
POST /api/generate-otp
Content-Type: application/json

Parameters:
{
  "user_id": "user-123"
}

Response:
{
  "status": "success",
  "message": "OTP sent to registered phone",
  "expires_in": 300  // seconds
}
```

### OTP Verification

```
POST /api/verify-otp
Content-Type: application/json

Parameters:
{
  "user_id": "user-123",
  "otp": "123456"
}

Response:
{
  "status": "success",
  "message": "OTP verified successfully"
}
```

## Blockchain Integration

The system uses Web3.py to interact with Ethereum smart contracts:

```python
from web3 import Web3

# Connect to Ethereum node
w3 = Web3(Web3.HTTPProvider("https://mainnet.infura.io/v3/YOUR_INFURA_KEY"))

# Smart contract ABI and address
contract_abi = [...] # ABI from compiled Solidity contract
contract_address = "0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47"

# Initialize contract
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

def cast_vote(user_id, election_id, candidate_id, private_key):
    # Get nonce for the transaction
    account = w3.eth.account.from_key(private_key)
    nonce = w3.eth.get_transaction_count(account.address)
    
    # Build transaction
    txn = contract.functions.castVote(election_id, candidate_id).build_transaction({
        'chainId': 1,
        'gas': 200000,
        'gasPrice': w3.to_wei('50', 'gwei'),
        'nonce': nonce,
    })
    
    # Sign and send transaction
    signed_txn = w3.eth.account.sign_transaction(txn, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
    
    # Wait for transaction receipt
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    return {
        "status": "success",
        "message": "Vote recorded on blockchain",
        "transaction_hash": tx_hash.hex(),
        "block_number": tx_receipt["blockNumber"]
    }
```

## Security Considerations

1. **Data Protection**: All facial biometric data is encrypted at rest
2. **Secure Transmission**: HTTPS for all API communications
3. **Rate Limiting**: Prevents brute force attacks on OTP verification
4. **Liveness Detection**: Ensures the face is from a live person, not a photo
5. **Encryption Keys**: Private keys for blockchain transactions are stored in secure HSM

## Deployment Instructions

1. Set up a Python environment with all dependencies
2. Configure environment variables for API keys and connection strings
3. Deploy the Flask application using Gunicorn/uWSGI
4. Set up Nginx as a reverse proxy
5. Enable SSL/TLS encryption
6. Configure firewall rules to restrict access

## Maintenance and Monitoring

- Use logging to track authentication attempts
- Monitor system performance and availability
- Regularly backup user data
- Implement health check endpoints

For more information, contact the development team.
