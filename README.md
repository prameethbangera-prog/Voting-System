<<<<<<< HEAD
# Online-Voting-System
This project implements a Decentralized Voting System using blockchain and multimodal biometric authentication. Voters are verified using face recognition, palm recognition, and OTP. Votes are securely encrypted and stored on the blockchain, preventing tampering and double voting while ensuring transparency and trust.
=======

# SecureVote Chain - Decentralized Voting System with Multimodel Biometric Verification

A complete decentralized voting system that combines blockchain technology with facial recognition, palm verification, and OTP for secure and transparent elections.

## Project Overview

SecureVote Chain is a project that implements a secure, transparent, and tamper-proof voting system using blockchain technology and multimodel biometric verification. The system provides:

- Facial recognition for voter authentication
- Palm recognition for additional identity verification (now with faster processing)
- Two-factor authentication with OTP
- Blockchain-based vote storage and verification
- Real-time result tracking and analytics
- Tamper-proof voting records
- Parallel processing of votes for enhanced performance

## Technology Stack

### Frontend
- React.js with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- Ethers.js for blockchain integration
- TensorFlow.js for client-side face/palm recognition

### Backend
- Supabase for database and authentication
- PostgreSQL for data storage
- Realtime subscriptions for live updates

### Blockchain
- Ethereum Smart Contracts (Solidity)
- IPFS for decentralized storage
- Transaction verification and validation

## Features

1. **Multi-factor Biometric Authentication**
   - Facial recognition verification (liveness detection)
   - Optimized palm recognition verification (faster processing)
   - One-time password (OTP) verification

2. **Secure User Registration**
   - Personal information collection
   - Biometric registration (face and palm)
   - Identity verification and validation

3. **Secure Voting Process**
   - Election selection with filtering options
   - Candidate voting with detailed information
   - Parallel blockchain and database transaction recording
   - Vote confirmation and receipt generation

4. **Transparent Results**
   - Real-time vote counting and updates
   - Multiple visualization options (charts, graphs)
   - Blockchain verification of all votes
   - Audit trail for election integrity

5. **Secure Data Management**
   - End-to-end encryption
   - Distributed storage of voting data
   - Immutable vote records
   - Privacy preservation

6. **Administrative Tools**
   - Election creation and management
   - Candidate registration
   - Voter eligibility verification
   - Result certification

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── Layout.tsx      # Main layout component
│   ├── FaceRecognition.tsx # Facial recognition component
│   ├── PalmRecognition.tsx # Palm recognition component  
│   └── OTPVerification.tsx # OTP verification component
├── pages/              # Main application pages
│   ├── Index.tsx       # Homepage
│   ├── Registration.tsx # User registration
│   ├── Vote.tsx        # Voting interface
│   └── Results.tsx     # Election results
├── hooks/              # Custom React hooks
│   ├── useAuth.tsx     # Authentication hook
│   └── useVoting.ts    # Voting functionality hook
├── utils/              # Utility functions and services
│   ├── VotingContract.ts # Blockchain interface
│   └── vote/           # Voting-related utilities
└── integrations/       # External integrations
    └── supabase/       # Supabase database connection
```

## Security Features

1. **Tamper-Proof Storage**
   - All votes are stored on a decentralized blockchain
   - Immutable records provide transparency and auditability
   - Cryptographic protection of all voting data

2. **Advanced Biometric Verification**
   - Multi-factor biometric authentication (face + palm)
   - Liveness detection to prevent spoofing
   - Secure storage of biometric templates

3. **Access Control**
   - Role-based permissions system
   - Secure authentication for all actions
   - Time-limited access tokens

4. **Audit and Monitoring**
   - Complete audit trail of all voting activities
   - Real-time monitoring of system health
   - Automated alerts for suspicious activities

## Performance Features
   - Parallel processing for blockchain and database operations
   - Optimized palm verification for faster authentication
   - Real-time vote counting updates
   - Efficient database queries and caching

## Running the Project

### Prerequisites
- Node.js 14+ and npm
- Ethereum wallet (for blockchain interaction)
- Modern web browser with camera access

### Setup
```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd secure-vote-chain

# Install dependencies
npm install

# Start development server
npm run dev
```

## Future Enhancements

- Mobile application integration
- Support for multiple election types
- Advanced analytics and reporting
- Integration with government ID verification
- Improved accessibility features
- Enhanced privacy-preserving techniques
- Support for international elections

## Contact

For more information about this project, please contact the project team.
>>>>>>> d78c778 (Initial commit)
