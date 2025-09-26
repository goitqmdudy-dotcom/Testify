import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const exportSubmissionsToPDF = async ({ submissions, selectedTest, setLoading, exportType = 'head' }) => {
  try {
    setLoading(true);
    
    let testQuestions = [];
    
    try {
      const questionsSnapshot = await getDocs(collection(db, 'tests', selectedTest.id, 'questions'));
      if (!questionsSnapshot.empty) {
        testQuestions = questionsSnapshot.docs.map(qDoc => {
          const data = qDoc.data();
          return { id: data.questionId || qDoc.id, ...data };
        });
      }

      if (testQuestions.length === 0) {
        const testDoc = await getDoc(doc(db, 'tests', selectedTest.id));
        if (testDoc.exists()) {
          const testData = testDoc.data();
          testQuestions = testData.questions || testData.Questions || testData.testQuestions || testData.questionsList || [];
          if (testQuestions.length === 0 && testData.questions && typeof testData.questions === 'object' && !Array.isArray(testData.questions)) {
            testQuestions = Object.values(testData.questions);
          }
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
      submissions.map(async (submission) => {
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

        const rowData = [
          userInfo.fullName,
          userInfo.mobile,
          userInfo.gmail,
          userInfo.year
        ];

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
                else if (answerKeys.length === testQuestions.length && index < answerKeys.length) {
                  answer = submission.answers[answerKeys[index]];
                }
              }
              
              const displayAnswer = answer ? (typeof answer === 'string' ? answer : JSON.stringify(answer)) : '-';
              rowData.push(displayAnswer);
            });
          } else {
            answerKeys.forEach((answerKey) => {
              const answer = submission.answers[answerKey];
              const displayAnswer = answer ? (typeof answer === 'string' ? answer : JSON.stringify(answer)) : '-';
              rowData.push(displayAnswer);
            });
          }
        } else {
          if (testQuestions.length > 0) {
            testQuestions.forEach(() => {
              rowData.push('-');
            });
          } else {
            for (let i = 0; i < 3; i++) {
              rowData.push('-');
            }
          }
        }

        rowData.push(
          submission.totalMarksAwarded || 0,
          `${submission.score || 0}%`,
          submission.status || 'submitted'
        );

        return rowData;
      })
    );

    const pdfDoc = new jsPDF('landscape');
    
    pdfDoc.setFontSize(16);
    const titlePrefix = exportType === 'admin' ? 'Admin Export - ' : '';
    pdfDoc.text(`${titlePrefix}Test Results: ${selectedTest.title}`, 14, 22);
    
    pdfDoc.setFontSize(10);
    pdfDoc.text(`Domain: ${selectedTest.branch || selectedTest.domain || 'N/A'}`, 14, 32);
    pdfDoc.text(`Total Marks: ${selectedTest.totalMarks || 100}`, 14, 38);
    pdfDoc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 44);
    pdfDoc.text(`Total Submissions: ${submissions.length}`, 14, 50);

    const baseHeaders = ['Student Name', 'Mobile', 'Gmail ID', 'Year'];
    const questionHeaders = [];
    
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
        const fullHeader = question.questionText 
          ? `Q${index + 1}: ${question.questionText}`
          : `Q${index + 1}`;
        questionHeaders.push(fullHeader);
      });
    } else {
      if (submissions.length > 0 && submissions[0].answers) {
        const answerKeys = Object.keys(submissions[0].answers).filter(key => 
          !key.includes('_notes') && 
          !key.includes('timestamp') && 
          !key.includes('metadata')
        );
        for (let i = 1; i <= answerKeys.length; i++) {
          questionHeaders.push(`Q${i}`);
        }
      } else {
        for (let i = 1; i <= 3; i++) {
          questionHeaders.push(`Q${i}`);
        }
      }
    }
    
    const summaryHeaders = ['Score', '%', 'Status'];
    const allHeaders = [...baseHeaders, ...questionHeaders, ...summaryHeaders];

    const headerColor = exportType === 'admin' ? [59, 130, 246] : [147, 51, 234];

    autoTable(pdfDoc, {
      head: [allHeaders],
      body: enrichedSubmissions,
      startY: 60,
      styles: { fontSize: 7 },
      headStyles: { fillColor: headerColor },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 12 },
        ...Object.fromEntries(
          questionHeaders.map((_, index) => [index + 4, { cellWidth: 40 }])
        )
      },
      margin: { left: 14, right: 14 },
      didParseCell: function (data) {
        if (data.cell.text[0] === '' || data.cell.text[0] === null || data.cell.text[0] === undefined) {
          data.cell.text = ['-'];
        }
      }
    });

    const filePrefix = exportType === 'admin' ? 'Admin_' : '';
    const fileName = `${selectedTest.title.replace(/[^a-zA-Z0-9]/g, '_')}_${filePrefix}Results_${new Date().toISOString().split('T')[0]}.pdf`;
    
    pdfDoc.save(fileName);
  } catch (error) {
  } finally {
    setLoading(false);
  }
};
