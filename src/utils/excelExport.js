import * as XLSX from 'xlsx';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const exportSubmissionsToExcel = async ({ submissions, selectedTest, setLoading }) => {
  try {
    setLoading(true);
    
    let testQuestions = [];
    try {
      const questionsSnapshot = await getDocs(collection(db, 'tests', selectedTest.id, 'questions'));
      if (!questionsSnapshot.empty) {
        testQuestions = questionsSnapshot.docs.map(qDoc => {
          const data = qDoc.data();
          return {
            id: data.questionId || qDoc.id,
            ...data,
          };
        });
      }

      if (testQuestions.length === 0) {
        const testDoc = await getDoc(doc(db, 'tests', selectedTest.id));
        if (testDoc.exists()) {
          const testData = testDoc.data();
          testQuestions = testData.questions || [];
        }
      }

      if (testQuestions.length === 0) {
        const altTestDoc = await getDoc(doc(db, 'test', selectedTest.id));
        if (altTestDoc.exists()) {
          const altTestData = altTestDoc.data();
          testQuestions = altTestData.questions || [];
        }
      }

      if (testQuestions.length === 0 && selectedTest.questions) {
        testQuestions = selectedTest.questions;
      }
    } catch (error) {
    }


    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission, submissionIndex) => {
        let userInfo = {
          fullName: submission.candidateName || 'Unknown',
          gmail: '',
          mobile: '',
          year: ''
        };

        if (submission.candidateId) {
          try {
            const userDoc = await getDoc(doc(db, 'user', submission.candidateId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userInfo = {
                fullName: userData.fullName || userData.name || submission.candidateName || 'Unknown',
                gmail: userData.gmail || userData.email || '',
                mobile: userData.mobile || userData.phone || '',
                year: userData.year || ''
              };
            }
          } catch (error) {
          }
        }

        const rowData = {
          'Student Name': userInfo.fullName,
          'Mobile Number': userInfo.mobile,
          'Gmail ID': userInfo.gmail,
          'Year': userInfo.year
        };

        if (submission.answers && typeof submission.answers === 'object') {
          const answerKeys = Object.keys(submission.answers).filter(key => 
            !key.includes('_notes') && 
            !key.includes('timestamp') && 
            !key.includes('metadata')
          );
          
          if (testQuestions.length > 0) {
            const sortedQuestions = [...testQuestions].sort((a, b) => {
              if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
              }
              if (a.index !== undefined && b.index !== undefined) {
                return a.index - b.index;
              }
              
              const aId = parseInt(a.id);
              const bId = parseInt(b.id);
              if (!isNaN(aId) && !isNaN(bId)) {
                return aId - bId;
              }
              
              if (a.createdAt && b.createdAt) {
                return a.createdAt - b.createdAt;
              }
              
              return testQuestions.indexOf(a) - testQuestions.indexOf(b);
            });
            
            sortedQuestions.forEach((question, index) => {
              const questionId = question.id;
              const questionText = question.questionText || `Question ${index + 1}`;
              
              let answer = '';
              
              if (submission.answers[questionId]) {
                answer = submission.answers[questionId];
              }
              else if (submission.answers[questionId.toString()]) {
                answer = submission.answers[questionId.toString()];
              }
              else if (submission.answers[index]) {
                answer = submission.answers[index];
              }
              else if (submission.answers[index.toString()]) {
                answer = submission.answers[index.toString()];
              }
              else {
                const possibleKeys = answerKeys.filter(key => {
                  const keyLower = key.toLowerCase();
                  const qidLower = String(questionId).toLowerCase();
                  return (keyLower === `q${index + 1}` || 
                          keyLower === `question${index + 1}` ||
                          keyLower === `question_${index + 1}` ||
                          keyLower.includes(qidLower) ||
                          key === (index + 1).toString());
                });
                
                if (possibleKeys.length > 0) {
                  answer = submission.answers[possibleKeys[0]];
                }
              }
              
              if (!answer && answerKeys.length === testQuestions.length && index < answerKeys.length) {
                answer = submission.answers[answerKeys[index]];
              }
              
              const columnHeader = questionText;
              
              const finalAnswer = answer ? (typeof answer === 'string' ? answer : JSON.stringify(answer)) : '-';
              rowData[columnHeader] = finalAnswer;
            });
          } else {
            answerKeys.forEach((answerKey, index) => {
              const answer = submission.answers[answerKey];
              const columnHeader = `Question ${index + 1}`;
              const finalAnswer = answer ? (typeof answer === 'string' ? answer : JSON.stringify(answer)) : '-';
              rowData[columnHeader] = finalAnswer;
            });
          }
        } else {
          testQuestions.forEach((question, index) => {
            const questionText = question.questionText || `Question ${index + 1}`;
            const columnHeader = questionText.length > 50 
              ? questionText.substring(0, 50) + '...' 
              : questionText;
            rowData[columnHeader] = '-';
          });
        }

        rowData['Score Obtained'] = submission.totalMarksAwarded || 0;
        rowData['Percentage'] = `${submission.score || 0}%`;
        rowData['Submitted At'] = submission.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A';

        return rowData;
      })
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(enrichedSubmissions);

    const headers = enrichedSubmissions.length > 0 ? Object.keys(enrichedSubmissions[0]) : [];
    const colWidths = headers.map(header => {
      if (header === 'Student Name') return { wch: 25 };
      if (header === 'Mobile Number') return { wch: 15 };
      if (header === 'Gmail ID') return { wch: 30 };
      if (header === 'Year') return { wch: 8 };
      if (header === 'Score Obtained') return { wch: 12 };
      if (header === 'Total Marks') return { wch: 12 };
      if (header === 'Percentage') return { wch: 12 };
      if (header === 'Submitted At') return { wch: 15 };
      return { wch: 60 };
    });
    
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');

    const fileName = `${selectedTest.title.replace(/[^a-zA-Z0-9]/g, '_')}_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    
  } catch (error) {
  } finally {
    setLoading(false);
  }
};
