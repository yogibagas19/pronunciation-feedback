// src/App.jsx

import { useState, useRef } from 'react';
import './App.css'; // Kita akan membuat file CSS ini nanti

const PREDEFINED_SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "She sells seashells by the seashore.",
  "Peter Piper picked a peck of pickled peppers.",
  "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
  "I saw a kitten eating chicken in the kitchen."
];

function App() {
  // === 1. STATE MANAGEMENT dengan React Hooks ===
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("Tekan tombol untuk mulai merekam pengucapan Anda.");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [popupData, setPopupData] = useState(null);
  const [referenceText, setReferenceText] = useState(PREDEFINED_SENTENCES[0]);


  // useRef digunakan untuk menyimpan objek yang tidak memicu re-render,
  // seperti MediaRecorder dan potongan audio.
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

    const handleDropdownChange = (event) => {
    setReferenceText(event.target.value);
    };

    const handleInputChange = (event) => {
      setReferenceText(event.target.value);
    };

  // const referenceText = "The quick brown fox jumps over the lazy dog.";
  const API_URL = "https://sl0thhhh-feedback.hf.space/analyze/";

  // === 2. FUNGSI-FUNGSI LOGIKA ===

  const handleRecordClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatusText("Perekaman berhenti, memproses...");
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          sendDataToBackend(audioBlob);
        };

        recorder.start();
        setIsRecording(true);
        setStatusText("Sedang merekam...");
        setAnalysisResult(null); // Sembunyikan hasil lama saat merekam baru
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setStatusText("Gagal mengakses mikrofon. Mohon berikan izin.");
      }
    }
  };

  const sendDataToBackend = async (audioBlob) => {
    setIsLoading(true);
    setStatusText("Menganalisis audio Anda...");

    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'user_recording.wav');
    formData.append('reference_text', referenceText);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      setAnalysisResult(data);
      setStatusText("Analisis selesai. Klik pada kata berwarna untuk melihat detail.");

    } catch (error) {
      console.error("Error sending data to backend:", error);
      setStatusText(`Gagal terhubung ke server. Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getWordClass = (score) => {
    if (score >= 90) return 'word-good';
    if (score >= 70) return 'word-ok';
    return 'word-bad';
  };

  // === 3. RENDER TAMPILAN DENGAN JSX ===
  return (
    <main className="container">
      <h1>Pronunciation Feedback System</h1>
      
      <div className="card">
        <h2>Kalimat Target</h2>
        
        <div className="input-options">
          <div className="option-group">
            <label htmlFor="sentence-select">Pilih dari Daftar:</label>
            <select id="sentence-select" value={referenceText} onChange={handleDropdownChange}>
              {PREDEFINED_SENTENCES.map((sentence, index) => (
                <option key={index} value={sentence}>
                  {sentence.substring(0, 40)}... 
                </option>
              ))}
            </select>
          </div>
          
          <div className="option-group">
            <label htmlFor="sentence-input">Atau Tulis Sendiri:</label>
            <textarea 
              id="sentence-input" 
              rows="3" 
              value={referenceText} 
              onChange={handleInputChange}
              placeholder="Tulis kalimat Anda di sini..."
            ></textarea>
          </div>
        </div>

        {/* Kita tetap tampilkan kalimat aktif di bawahnya agar jelas */}
        <p id="reference-text-display">{referenceText}</p>
      </div>

      <div id="controls" className="card">
        <button id="record-btn" onClick={handleRecordClick} disabled={isLoading} className={isRecording ? 'recording' : ''}>
          <span className="icon">🎤</span>
          <span className="text">{isRecording ? 'Berhenti Merekam' : 'Mulai Merekam'}</span>
        </button>
        <p id="status-text">{statusText}</p>
      </div>

      {/* Conditional Rendering untuk Loader */}
      {isLoading && (
        <div id="loader">
          <div className="spinner"></div>
          <p>Menganalisis audio Anda...</p>
        </div>
      )}

      {/* Conditional Rendering untuk Hasil Analisis */}
      {analysisResult && !isLoading && (
        <div id="results-container" className="card">
          <h2>Hasil Analisis</h2>
          <p id="overall-score">Skor Keseluruhan: {analysisResult.overall_score.toFixed(0)}/100</p>
          <div className="transcription-result">
            <h4>Transkripsi dari Suara Anda: {analysisResult.transcribed_text}</h4>
            {/* <p>{analysisResult.transcribed_text}</p> */}
          </div>
          <div id="word-analysis">
            {analysisResult.words.map((wordData, index) => (
              <span
                key={index}
                className={`word-span ${getWordClass(wordData.accuracy_score)}`}
                onClick={() => setPopupData(wordData)}
              >
                {wordData.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conditional Rendering untuk Popup Detail */}
      {popupData && (
        <>
          <div id="overlay" onClick={() => setPopupData(null)}></div>
          <div id="details-popup">
            <div id="details-content">
              <h3>Detail Kata: "{popupData.word}"</h3>
              <p><strong>Skor Kata:</strong> {popupData.accuracy_score.toFixed(0)}/100</p>
              <p><strong>Tipe Kesalahan:</strong> {popupData.error_type}</p>
              <h4>Analisis Fonem:</h4>
              <ul>
                {popupData.phonemes.map((p, i) => (
                  <li key={i}>
                    <span>Fonem: /{p.phoneme}/</span>
                    <span className={getWordClass(p.accuracy_score)}>Skor: {p.accuracy_score.toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button id="close-popup-btn" onClick={() => setPopupData(null)}>&times;</button>
          </div>
        </>
      )}
    </main>
  );
}

export default App;

// src/App.jsx (Versi Final dengan RecordRTC)

// import { useState, useRef, useEffect } from 'react';
// import RecordRTC from 'recordrtc'; // <-- Impor library baru
// import './App.css';

// const PREDEFINED_SENTENCES = [
//   "The quick brown fox jumps over the lazy dog.",
//   "She sells seashells by the seashore.",
//   "Peter Piper picked a peck of pickled peppers.",
// ];

// function App() {
//   const [isRecording, setIsRecording] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [statusText, setStatusText] = useState("Tekan tombol untuk mulai merekam pengucapan Anda.");
//   const [analysisResult, setAnalysisResult] = useState(null);
//   const [popupData, setPopupData] = useState(null);
//   const [referenceText, setReferenceText] = useState(PREDEFINED_SENTENCES[0]);

//   // Ref ini sekarang akan menyimpan objek RecordRTC
//   const recorderRef = useRef(null);
//   // Ref untuk stream mikrofon, agar bisa dihentikan
//   const streamRef = useRef(null);

//   const API_URL = "http://127.0.0.1:8000/analyze/";

//   // Fungsi untuk memulai perekaman dengan RecordRTC
//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       streamRef.current = stream; // Simpan stream untuk dihentikan nanti

//       const recorder = new RecordRTC(stream, {
//         type: 'audio',
//         mimeType: 'audio/wav',
//         recorderType: RecordRTC.StereoAudioRecorder, // Gunakan recorder internal yang handal
//         sampleRate: 44100, // Rekam dengan kualitas tinggi
//         numberOfAudioChannels: 1, // Mono
//       });

//       recorder.startRecording();
//       recorderRef.current = recorder;
//       setIsRecording(true);
//       setStatusText("Sedang merekam...");
//       setAnalysisResult(null);
//     } catch (error) {
//       console.error("Error accessing microphone:", error);
//       setStatusText("Gagal mengakses mikrofon. Mohon berikan izin.");
//     }
//   };

//   // Fungsi untuk menghentikan perekaman dengan RecordRTC
//   const stopRecording = () => {
//     recorderRef.current.stopRecording(() => {
//       const audioBlob = recorderRef.current.getBlob();
//       sendDataToBackend(audioBlob);

//       // Hentikan track mikrofon setelah selesai
//       streamRef.current.getTracks().forEach(track => track.stop());
//       recorderRef.current.destroy();
//       recorderRef.current = null;
//     });
//     setIsRecording(false);
//     setStatusText("Perekaman berhenti, memproses...");
//   };

//   // Fungsi utama yang dipanggil tombol
//   const handleRecordClick = () => {
//     if (isRecording) {
//       stopRecording();
//     } else {
//       startRecording();
//     }
//   };

//   // Fungsi untuk mengirim data ke backend (tidak berubah)
//   const sendDataToBackend = async (audioBlob) => {
//     setIsLoading(true);
//     setStatusText("Menganalisis audio Anda...");
//     const formData = new FormData();
//     formData.append('audio_file', audioBlob, 'user_recording.wav');
//     formData.append('reference_text', referenceText);
//     try {
//       const response = await fetch(API_URL, { method: 'POST', body: formData });
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.detail || `Server error: ${response.status}`);
//       }
//       const data = await response.json();
//       setAnalysisResult(data);
//       setStatusText("Analisis selesai. Klik pada kata berwarna untuk melihat detail.");
//     } catch (error) {
//       console.error("Error sending data to backend:", error);
//       setStatusText(`Gagal terhubung ke server. Error: ${error.message}`);
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   // Sisa JSX dan fungsi helper (getWordClass, dll) tetap sama
//   // ... (Kode JSX dari jawaban sebelumnya bisa disalin-tempel di sini) ...
//   return ( <main className="container"> ... </main> ); // Ganti dengan JSX lengkap Anda
// }

// export default App;