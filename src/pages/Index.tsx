import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Vote, 
  BarChart, 
  ArrowRight, 
  LockKeyhole, 
  BookOpen, 
  User,
  Check,
  Info
} from 'lucide-react';
import Layout from '@/components/Layout';

const Home = () => {
  const navigate = useNavigate();
  
  return (
    <Layout>
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-6 sm:text-5xl">
              Secure Decentralized Voting System with Multi-Model Biometric Verification
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A transparent, secure, and tamper-proof electoral system using cutting-edge technology
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/registration')}>
                Register to Vote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/vote')}>
                Access Voting System
              </Button>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 mb-12">
            <Card className="bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Tamper-Proof Security</h3>
                <p className="text-muted-foreground">
                  All votes are stored on a decentralized blockchain, making them immutable and resistant to tampering.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <User className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Facial Verification</h3>
                <p className="text-muted-foreground">
                  Advanced facial recognition ensures only eligible registered voters can access the system.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <BarChart className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-Time Results</h3>
                <p className="text-muted-foreground">
                  View election results in real-time with detailed analytics and blockchain verification.
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Removed voting process diagram section */}
        </div>
      </section>
      
      {/* Added about project section */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
              <Info className="h-6 w-6 text-primary" />
              About The Project
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              SecureVote Chain is a blockchain-based voting system designed to revolutionize electoral processes by providing security, transparency, and convenience.
            </p>
            <div className="prose dark:prose-invert max-w-none">
              <p className="mb-4">
                This project was created as part of a Bachelor of Engineering major project, aiming to solve common voting system issues like tampering, fraud, and accessibility. By leveraging blockchain and facial recognition technologies, we've created a system that ensures:
              </p>
              <ul className="text-left list-disc pl-6 mb-6 space-y-2">
                <li>Each voter can only vote once</li>
                <li>Votes cannot be altered once cast</li>
                <li>The entire voting process is transparent and verifiable</li>
                <li>Personal data is kept secure and private</li>
                <li>Voting results are calculated accurately and quickly</li>
              </ul>
              <p>
                The project has been developed using Ethereum smart contracts for the blockchain component, TensorFlow for facial recognition, and a React-based frontend for a seamless user experience.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <LockKeyhole className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Security Features</h3>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Immutable blockchain record of all votes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Advanced biometric identity verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Encrypted end-to-end communication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Two-factor authentication with OTP</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Technical Specifications</h3>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Ethereum-based smart contracts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Zero-knowledge proofs for vote privacy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">TensorFlow-based facial recognition</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full p-0.5 bg-green-100 text-green-600 mt-1">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm">IPFS decentralized storage</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="text-center">
              <Button size="lg" onClick={() => navigate('/registration')}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
