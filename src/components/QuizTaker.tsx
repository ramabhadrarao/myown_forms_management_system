import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Clock, CheckCircle, XCircle, Award, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface QuizTakerProps {
  quizId: string;
  onBack: () => void;
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'essay';
  question: string;
  questionLatex?: string;
  options: { id: string; text: string; latex?: string }[];
  points: number;
  timeLimit?: number;
  explanation?: string;
  explanationLatex?: string;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  settings: {
    timeLimit: number;
    showResults: string;
    allowRetake: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showCorrectAnswers: boolean;
    showExplanations: boolean;
    passingScore: number;
  };
  createdBy: {
    name: string;
    email: string;
  };
}

interface QuizResult {
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  completionTime: number;
  detailedResults?: Array<{
    questionId: string;
    userAnswer: any;
    isCorrect: boolean;
    pointsEarned: number;
    correctAnswer?: any;
    explanation?: string;
    explanationLatex?: string;
  }>;
}

export function QuizTaker({ quizId, onBack }: QuizTakerProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<QuizResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchQuiz();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizId]);

  useEffect(() => {
    if (quizStarted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizStarted, timeRemaining]);

  const fetchQuiz = async () => {
    try {
      const response = await axios.get(`/quizzes/${quizId}`);
      setQuiz(response.data);
      setTimeRemaining(response.data.settings.timeLimit * 60); // Convert minutes to seconds
    } catch (error: any) {
      setError(error.response?.data?.message || 'Quiz not found');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setStartTime(Date.now());
    setQuestionStartTime(Date.now());
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const goToNextQuestion = () => {
    if (!quiz) return;

    // Record time spent on current question
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const timeSpent = (Date.now() - questionStartTime) / 1000;
    setQuestionTimes(prev => ({
      ...prev,
      [currentQuestion.id]: timeSpent
    }));

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleTimeUp = () => {
    if (!quizCompleted) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!quiz || submitting) return;

    setSubmitting(true);

    try {
      // Record time for the last question
      const currentQuestion = quiz.questions[currentQuestionIndex];
      const timeSpent = (Date.now() - questionStartTime) / 1000;
      const finalQuestionTimes = {
        ...questionTimes,
        [currentQuestion.id]: timeSpent
      };

      const formattedAnswers = quiz.questions.map(question => ({
        questionId: question.id,
        answer: answers[question.id] || '',
        timeSpent: finalQuestionTimes[question.id] || 0
      }));

      const completionTime = Math.floor((Date.now() - startTime) / 1000);

      const response = await axios.post(`/quizzes/${quiz._id}/submit`, {
        answers: formattedAnswers,
        completionTime
      });

      setQuizCompleted(true);
      if (response.data.results) {
        setResults(response.data.results);
      }
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      setError(error.response?.data?.message || 'Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLatex = (text: string, latex?: string) => {
    if (latex) {
      return <div dangerouslySetInnerHTML={{ __html: `$${latex}$` }} />;
    }
    return text;
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || '';

    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1">
                  {renderLatex(option.text, option.latex)}
                </span>
              </label>
            ))}
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option.text}
                  checked={value === option.text}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'fill-blank':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your answer"
          />
        );

      case 'essay':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={6}
            placeholder="Enter your essay answer"
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Available</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Quiz completed - show results
  if (quizCompleted && results) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Results Header */}
            <div className={`p-8 text-center ${results.passed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                results.passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {results.passed ? (
                  <Award className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-600" />
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {results.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
              </h1>
              
              <div className="text-6xl font-bold mb-4">
                <span className={results.passed ? 'text-green-600' : 'text-red-600'}>
                  {results.percentage}%
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{results.score}</div>
                  <div className="text-sm text-gray-600">Points Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{results.totalPoints}</div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{formatTime(results.completionTime)}</div>
                  <div className="text-sm text-gray-600">Time Taken</div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            {results.detailedResults && (
              <div className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Question Review</h2>
                <div className="space-y-6">
                  {results.detailedResults.map((result, index) => {
                    const question = quiz.questions.find(q => q.id === result.questionId);
                    if (!question) return null;

                    return (
                      <div key={result.questionId} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Question {index + 1}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                result.isCorrect
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {renderLatex(question.question, question.questionLatex)}
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {result.pointsEarned}/{question.points}
                            </div>
                            <div className="text-sm text-gray-600">points</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Your Answer: </span>
                            <span className={`${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {Array.isArray(result.userAnswer) 
                                ? result.userAnswer.join(', ') 
                                : result.userAnswer?.toString() || 'No answer'
                              }
                            </span>
                          </div>

                          {quiz.settings.showCorrectAnswers && result.correctAnswer && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Correct Answer: </span>
                              <span className="text-green-600">
                                {Array.isArray(result.correctAnswer) 
                                  ? result.correctAnswer.join(', ') 
                                  : result.correctAnswer?.toString()
                                }
                              </span>
                            </div>
                          )}

                          {quiz.settings.showExplanations && result.explanation && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-sm font-medium text-blue-900 mb-1">Explanation:</div>
                              <div className="text-sm text-blue-800">
                                {renderLatex(result.explanation, result.explanationLatex)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-center space-x-4">
                <button
                  onClick={onBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Quiz List
                </button>
                {quiz.settings.allowRetake && (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retake Quiz</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz not started yet
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Quiz Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
              <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-blue-100 mb-4">{quiz.description}</p>
              )}
              <div className="text-sm text-blue-100">
                Created by {quiz.createdBy.name}
              </div>
            </div>

            {/* Quiz Info */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{quiz.questions.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{quiz.totalPoints}</div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{quiz.settings.timeLimit}</div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{quiz.settings.passingScore}%</div>
                  <div className="text-sm text-gray-600">Passing Score</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions</h3>
                <ul className="space-y-2 text-blue-800">
                  <li>• You have {quiz.settings.timeLimit} minutes to complete this quiz</li>
                  <li>• You can navigate between questions using the Previous/Next buttons</li>
                  <li>• Your progress will be automatically saved</li>
                  {quiz.settings.allowRetake && <li>• You can retake this quiz if needed</li>}
                  {quiz.settings.shuffleQuestions && <li>• Questions will be presented in random order</li>}
                  {quiz.settings.showResults === 'immediately' && <li>• Results will be shown after each question</li>}
                  {quiz.settings.showResults === 'after_submit' && <li>• Results will be shown after submission</li>}
                </ul>
              </div>

              <div className="text-center">
                <button
                  onClick={startQuiz}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                >
                  Start Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Timer and Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className={`font-mono text-lg ${
                  timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {renderLatex(currentQuestion.question, currentQuestion.questionLatex)}
            </h2>
          </div>

          <div className="mb-8">
            {renderQuestion(currentQuestion)}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              {currentQuestionIndex === quiz.questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center space-x-2 bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Submitting...' : 'Submit Quiz'}</span>
                </button>
              ) : (
                <button
                  onClick={goToNextQuestion}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}