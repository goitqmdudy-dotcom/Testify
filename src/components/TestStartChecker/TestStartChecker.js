import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFirebase } from '../../context/FirebaseContext';
import BlockedSubmissionCard from '../BlockedSubmissionCard/BlockedSubmissionCard';

function TestStartChecker({ testData, onPasswordPrompt, onStartTest }) {
  const { user } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');

  useEffect(() => {
    checkSubmissionStatus();
  }, [user, testData]);

  const checkSubmissionStatus = async () => {
    if (!user || !testData) return;

    try {
      setLoading(true);
      
      const existingSubmissionsQuery = query(
        collection(db, 'results'),
        where('candidateId', '==', user.uid),
        where('testId', '==', testData.testId || testData.id)
      );
      const existingSubmissions = await getDocs(existingSubmissionsQuery);
      const submissionCount = existingSubmissions.size;
      

      if (submissionCount === 0) {
        onPasswordPrompt();
      } else if (submissionCount > 0 && !testData.allowMultipleSubmissions) {
        setBlockMessage(
          `This test does not allow multiple submissions. You have already submitted this test ${submissionCount} time${submissionCount > 1 ? 's' : ''}. Please contact your domain head if you need to retake this test.`
        );
        setShowBlocked(true);
      } else if (submissionCount > 0 && testData.allowMultipleSubmissions) {
        if (submissionCount >= 3) {
          setBlockMessage(
            `You have reached the maximum number of attempts (3) for this test. You have already submitted this test ${submissionCount} times. Please contact your domain head if you need additional attempts.`
          );
          setShowBlocked(true);
        } else {
          onPasswordPrompt();
        }
      }
      
    } catch (error) {
      onPasswordPrompt();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🔍</div>
          <h3>Checking Test Status...</h3>
          <p style={{ color: '#6b7280' }}>Please wait while we verify your submission history.</p>
        </div>
      </div>
    );
  }

  if (showBlocked) {
    return <BlockedSubmissionCard message={blockMessage} />;
  }

  return null;
}

export default TestStartChecker;
