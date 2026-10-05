import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, UploadCloud, X, Camera } from 'lucide-react'
import { Button, Input, cx } from '../../components/ui'

export default function ProblemDescriptionStep({ problem, setProblem, files, setFiles, onBack, onConfirm, busy }) {
  const [listening, setListening] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' '
          }
        }
        if (finalTranscript) {
          setProblem((prev) => (prev + ' ' + finalTranscript).trim())
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error)
        setListening(false)
      }
      
      recognitionRef.current.onend = () => {
        setListening(false)
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [setProblem])

  const toggleListen = () => {
    if (!recognitionRef.current) return alert("Your browser doesn't support speech recognition.")
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (files.length + validFiles.length > 3) {
      alert("You can only upload up to 3 files.")
      return
    }
    setFiles([...files, ...validFiles.slice(0, 3 - files.length)])
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h3 className="text-lg font-semibold text-ink">Describe the Issue</h3>
        <p className="text-sm text-muted">Tell us what's wrong, or use the mic to dictate.</p>
      </div>

      <div className="relative">
        <Input 
          as="textarea" 
          rows={5} 
          label="Problem description" 
          value={problem} 
          onChange={(e) => setProblem(e.target.value)} 
          required 
          className="pb-12"
          placeholder="E.g., Brakes are making a squeaking noise..."
        />
        <button 
          type="button"
          onClick={toggleListen}
          className={cx(
            "absolute bottom-4 right-4 flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300 shadow-md",
            listening 
              ? "bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-500/30 animate-pulse" 
              : "bg-surface-2 text-muted border border-line hover:border-brand-500 hover:text-brand-500"
          )}
          title={listening ? "Stop dictating" : "Dictate"}
        >
          {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-ink">Photos / Videos (Optional)</h4>
          <span className="text-xs text-muted">{files.length} / 3</span>
        </div>
        
        {files.length < 3 && (
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={cx(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out cursor-pointer",
              dragOver ? "border-brand-500 bg-brand-50/50 scale-[1.02]" : "border-line hover:border-brand-400 hover:bg-surface-2"
            )}
          >
            <input type="file" multiple accept="image/*,video/*" className="hidden" id="file-upload" onChange={handleFileChange} />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink"><span className="text-brand-600">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-muted mt-1">PNG, JPG, MP4 up to 10MB</p>
              </div>
            </label>
          </div>
        )}

        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            {files.map((file, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-line aspect-square bg-surface-2 flex items-center justify-center">
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt="Upload preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={() => removeFile(i)} className="bg-white/20 hover:bg-red-500 text-white rounded-full p-2 backdrop-blur-sm transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-line">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onConfirm} loading={busy} disabled={!problem}>Confirm Booking</Button>
      </div>
    </div>
  )
}
