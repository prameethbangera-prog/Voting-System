
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Shield, Fingerprint, Vote, UserCheck, CheckCircle } from 'lucide-react';

const About = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">Secure Electronic Voting System</h1>
        <p className="text-center text-muted-foreground mb-8">
          An advanced, secure platform for democratic elections
        </p>
        
        {/* Main Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>About Our Platform</CardTitle>
            <CardDescription>Our mission and technology</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Our electronic voting system is designed to provide a secure, transparent, and accessible
              platform for conducting elections. Using advanced biometric verification, blockchain technology, 
              and real-time vote counting, we ensure that every vote is legitimate and accurately recorded.
            </p>
            <p>
              The system employs multiple layers of security including facial recognition, palm verification,
              and one-time password authentication to prevent fraud while maintaining voter privacy. All votes
              are recorded on a secure blockchain, providing an immutable record that cannot be altered
              after submission.
            </p>
          </CardContent>
        </Card>
        
        {/* Security Features */}
        <h2 className="text-2xl font-bold mb-4">Advanced Security Features</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <Shield className="h-5 w-5 mr-2 text-blue-500" />
                Multi-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our system employs multiple verification steps to ensure only eligible voters can participate.
                This includes face recognition, palm verification, and one-time password authentication, making 
                it virtually impossible for unauthorized individuals to cast votes.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Facial Recognition', 'Palm Biometrics', 'OTP Verification'].map((item, i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <Fingerprint className="h-5 w-5 mr-2 text-purple-500" />
                Biometric Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Advanced biometric verification ensures that each voter is properly identified before
                casting their vote. Our facial recognition and palm scanning technologies are equipped with
                liveness detection to prevent spoofing attempts using photos or recordings.
              </p>
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Palm line detection for enhanced security</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Facial feature analysis with depth mapping</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Liveness detection to prevent spoofing</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Features */}
        <h2 className="text-2xl font-bold mb-4">Key Platform Features</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                Simple Registration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our streamlined registration process allows eligible voters to quickly register
                their biometric information and personal details, ensuring they're ready to vote
                securely in any upcoming election.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <Vote className="h-5 w-5 mr-2 text-amber-500" />
                Real-Time Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Watch votes being counted in real-time as they're cast. Our system provides
                transparent vote tallying while maintaining the anonymity of individual voters,
                ensuring both transparency and privacy.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <Shield className="h-5 w-5 mr-2 text-red-500" />
                Immutable Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Every vote is securely recorded and cannot be altered or deleted once cast.
                This provides an auditable trail while maintaining the integrity of the election
                process from start to finish.
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Palm Verification Section */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Enhanced Palm Recognition</CardTitle>
            <CardDescription>How our palm verification technology works</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <h3 className="font-medium text-lg mb-2">Advanced Detection Features</h3>
                <p className="mb-4">
                  Our palm verification system uses advanced computer vision to analyze the unique 
                  patterns in your palm, including palm lines, fingerprint patterns, and vascular structure.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <span>Analyzes palm lines including heart, head, and life lines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <span>Detects and validates palm geometry for unique identification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <span>Performs liveness detection to prevent fraudulent attempts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <span>Secured storage of biometric templates with encryption</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2">
                <h3 className="font-medium text-lg mb-2">Security Measures</h3>
                <p className="mb-4">
                  The palm verification system is designed with multiple security layers to ensure 
                  accurate identification while preventing potential exploits.
                </p>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Security Features:</h4>
                  <div className="space-y-1">
                    <div className="text-sm flex justify-between">
                      <span>Palm Line Detection</span>
                      <span className="font-medium text-green-600">Enhanced</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="text-sm flex justify-between">
                      <span>Liveness Check</span>
                      <span className="font-medium text-green-600">Active</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="text-sm flex justify-between">
                      <span>Replay Attack Prevention</span>
                      <span className="font-medium text-green-600">Enabled</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>Secure Electronic Voting System &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">Ensuring secure, transparent, and accessible elections for all</p>
        </footer>
      </div>
    </Layout>
  );
};

export default About;
