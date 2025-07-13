import React, { useState, useEffect } from "react";
import { db } from "../context/Firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useUser } from "../context/adminContext";

const QuestionManager = () => {
  const { user } = useUser();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    options: [{ id: 1, label: "" }],
    correctOptionId: 1,
    quizId: "/collection/quizzes",
    storeId: user?.storeId || "",
  });
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Fetch questions from Firebase for current store
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "questions"));
      const questionsData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((question) => question.storeId === user?.storeId);
      setQuestions(questionsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.storeId) {
      fetchQuestions();
    }
  }, [user?.storeId]);

  // Handle input changes for new question
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewQuestion((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle option changes for new question
  const handleOptionChange = (index, e) => {
    const { value } = e.target;
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index].label = value;
    setNewQuestion((prev) => ({
      ...prev,
      options: updatedOptions,
    }));
  };

  // Handle changes for editing question
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingQuestion((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle option changes for editing question
  const handleEditOptionChange = (index, e) => {
    const { value } = e.target;
    const updatedOptions = [...editingQuestion.options];
    updatedOptions[index].label = value;
    setEditingQuestion((prev) => ({
      ...prev,
      options: updatedOptions,
    }));
  };

  // Add a new option
  const addOption = (isEditing = false) => {
    if (isEditing) {
      const newId =
        editingQuestion.options.length > 0
          ? Math.max(...editingQuestion.options.map((o) => o.id)) + 1
          : 1;
      setEditingQuestion((prev) => ({
        ...prev,
        options: [...prev.options, { id: newId, label: "" }],
      }));
    } else {
      const newId =
        newQuestion.options.length > 0
          ? Math.max(...newQuestion.options.map((o) => o.id)) + 1
          : 1;
      setNewQuestion((prev) => ({
        ...prev,
        options: [...prev.options, { id: newId, label: "" }],
      }));
    }
  };

  // Remove an option
  const removeOption = (index, isEditing = false) => {
    if (isEditing) {
      const updatedOptions = editingQuestion.options.filter(
        (_, i) => i !== index
      );
      setEditingQuestion((prev) => ({
        ...prev,
        options: updatedOptions,
        correctOptionId:
          prev.correctOptionId === editingQuestion.options[index].id
            ? updatedOptions[0]?.id || 1
            : prev.correctOptionId,
      }));
    } else {
      const updatedOptions = newQuestion.options.filter((_, i) => i !== index);
      setNewQuestion((prev) => ({
        ...prev,
        options: updatedOptions,
        correctOptionId:
          prev.correctOptionId === newQuestion.options[index].id
            ? updatedOptions[0]?.id || 1
            : prev.correctOptionId,
      }));
    }
  };

  // Add a new question
  const addQuestion = async () => {
    try {
      if (!newQuestion.text || newQuestion.options.some((opt) => !opt.label)) {
        alert("Please fill all fields");
        return;
      }

      await addDoc(collection(db, "questions"), {
        ...newQuestion,
        storeId: user.storeId,
      });
      setNewQuestion({
        text: "",
        options: [{ id: 1, label: "" }],
        correctOptionId: 1,
        quizId: "/collection/quizzes",
        storeId: user.storeId,
      });
      fetchQuestions();
    } catch (error) {
      console.error("Error adding question:", error);
    }
  };

  // Start editing a question
  const startEditing = (question) => {
    setEditingQuestion({ ...question });
  };

  // Save edited question
  const saveEditedQuestion = async () => {
    try {
      if (
        !editingQuestion.text ||
        editingQuestion.options.some((opt) => !opt.label)
      ) {
        alert("Please fill all fields");
        return;
      }

      await updateDoc(doc(db, "questions", editingQuestion.id), {
        text: editingQuestion.text,
        options: editingQuestion.options,
        correctOptionId: editingQuestion.correctOptionId,
        quizId: editingQuestion.quizId,
      });
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error("Error updating question:", error);
    }
  };

  // Delete a question
  const deleteQuestion = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteDoc(doc(db, "questions", id));
        fetchQuestions();
      } catch (error) {
        console.error("Error deleting question:", error);
      }
    }
  };

  // Update correct answer
  const updateCorrectAnswer = (optionId, isEditing = false) => {
    if (isEditing) {
      setEditingQuestion((prev) => ({
        ...prev,
        correctOptionId: optionId,
      }));
    } else {
      setNewQuestion((prev) => ({
        ...prev,
        correctOptionId: optionId,
      }));
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingQuestion(null);
  };

  return (
    <div className="question-manager-container">
      {!user?.storeId ? (
        <div className="login-message">
          <h2>Admin Portal</h2>
          <p>Please login to manage questions</p>
        </div>
      ) : (
        <>
          <header className="manager-header">
            <h1 className="manager-title">Question Manager</h1>
            <div className="manager-subtitle"></div>
          </header>

          {/* Add Question Form */}
          <div className="question-form-card">
            <h2 className="section-title">Add New Question</h2>

            <div className="form-group">
              <label className="form-label">Question Text</label>
              <input
                type="text"
                name="text"
                value={newQuestion.text}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter question text"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Options</label>
              {newQuestion.options.map((option, index) => (
                <div key={`new-${option.id}`} className="option-row">
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, e)}
                    className="option-input"
                    placeholder={`Option ${option.id}`}
                  />
                  <div className="option-actions">
                    <input
                      type="radio"
                      name="correctOptionNew"
                      checked={newQuestion.correctOptionId === option.id}
                      onChange={() => updateCorrectAnswer(option.id)}
                      className="correct-radio"
                    />
                    <span className="correct-label">Correct</span>
                    <button
                      onClick={() => removeOption(index)}
                      className="remove-option-btn"
                      title="Remove option"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => addOption(false)}
                className="add-option-btn"
              >
                + Add Option
              </button>
            </div>

            <button onClick={addQuestion} className="submit-btn primary">
              Add Question
            </button>
          </div>

          {/* Question List */}
          <div className="question-list-card">
            <h2 className="section-title">Question List</h2>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading questions...</p>
              </div>
            ) : questions.length === 0 ? (
              <p className="empty-state">
                No questions found. Add your first question above.
              </p>
            ) : (
              <ul className="questions-grid">
                {questions.map((question) => (
                  <li key={question.id} className="question-card">
                    {editingQuestion?.id === question.id ? (
                      <div className="edit-form">
                        <div className="form-group">
                          <label className="form-label">Question Text</label>
                          <input
                            type="text"
                            name="text"
                            value={editingQuestion.text}
                            onChange={handleEditChange}
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Options</label>
                          {editingQuestion.options.map((option, index) => (
                            <div
                              key={`edit-${option.id}`}
                              className="option-row"
                            >
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) =>
                                  handleEditOptionChange(index, e)
                                }
                                className="option-input"
                              />
                              <div className="option-actions">
                                <input
                                  type="radio"
                                  name={`correctOptionEdit-${editingQuestion.id}`}
                                  checked={
                                    editingQuestion.correctOptionId ===
                                    option.id
                                  }
                                  onChange={() =>
                                    updateCorrectAnswer(option.id, true)
                                  }
                                  className="correct-radio"
                                />
                                <span className="correct-label">Correct</span>
                                <button
                                  onClick={() => removeOption(index, true)}
                                  className="remove-option-btn"
                                  title="Remove option"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(true)}
                            className="add-option-btn"
                          >
                            + Add Option
                          </button>
                        </div>

                        <div className="edit-form-actions">
                          <button
                            onClick={saveEditedQuestion}
                            className="submit-btn primary"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="submit-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="question-content">
                        <div className="question-text">{question.text}</div>
                        <ul className="options-list">
                          {question.options.map((option) => (
                            <li
                              key={`display-${option.id}`}
                              className={`option-item ${
                                question.correctOptionId === option.id
                                  ? "correct"
                                  : ""
                              }`}
                            >
                              <span className="option-label">
                                {option.label}
                              </span>
                              {question.correctOptionId === option.id && (
                                <span className="correct-badge">Correct</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="question-actions">
                          <button
                            onClick={() => startEditing(question)}
                            className="action-btn edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteQuestion(question.id)}
                            className="action-btn delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      <style jsx>{`
        /* Base Styles */
        .question-manager-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
        }

        /* Header */
        .manager-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
        }

        .manager-title {
          font-size: 2rem;
          color: #2c3e50;
          margin: 0;
        }

        .manager-subtitle {
          font-size: 1rem;
          color: #7f8c8d;
          margin-top: 0.5rem;
        }

        /* Cards */
        .question-form-card,
        .question-list-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        /* Section Titles */
        .section-title {
          font-size: 1.5rem;
          color: #2c3e50;
          margin-top: 0;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #f0f0f0;
        }

        /* Form Styles */
        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #34495e;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #3498db;
        }

        /* Option Rows */
        .option-row {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
          gap: 0.5rem;
        }

        .option-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .option-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .correct-radio {
          margin: 0;
        }

        .correct-label {
          font-size: 0.9rem;
          color: #7f8c8d;
        }

        /* Buttons */
        .add-option-btn {
          background: #f8f9fa;
          color: #3498db;
          border: 1px dashed #3498db;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .add-option-btn:hover {
          background: #e3f2fd;
        }

        .remove-option-btn {
          background: #ffebee;
          color: #e74c3c;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .remove-option-btn:hover {
          background: #e74c3c;
          color: white;
        }

        .submit-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary {
          background: #3498db;
          color: white;
        }

        .primary:hover {
          background: #2980b9;
        }

        /* Question List */
        .questions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          padding: 0;
          list-style: none;
        }

        .question-card {
          background: white;
          border: 1px solid #eaeaea;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .question-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .question-content {
          padding: 1.25rem;
        }

        .question-text {
          font-weight: 600;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .options-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem 0;
        }

        .option-item {
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          border-radius: 4px;
          background: #f8f9fa;
          display: flex;
          justify-content: space-between;
        }

        .option-item.correct {
          background: #e8f5e9;
          border-left: 3px solid #2ecc71;
        }

        .correct-badge {
          background: #2ecc71;
          color: white;
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
        }

        /* Question Actions */
        .question-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit {
          background: #f1c40f;
          color: #34495e;
        }

        .edit:hover {
          background: #f39c12;
        }

        .delete {
          background: #e74c3c;
          color: white;
        }

        .delete:hover {
          background: #c0392b;
        }

        /* States */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          color: #7f8c8d;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .empty-state {
          text-align: center;
          color: #7f8c8d;
          padding: 2rem;
        }

        .login-message {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          max-width: 500px;
          margin: 2rem auto;
        }

        .login-message h2 {
          color: #2c3e50;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default QuestionManager;
