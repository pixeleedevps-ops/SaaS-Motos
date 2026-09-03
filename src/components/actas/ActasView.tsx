import React, { useState, useRef, useEffect } from 'react';
import {
  FileCheck2,
  FileSpreadsheet,
  Plus,
  Printer,
  Eye,
  Fuel,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
  ZoomIn,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActaTecnica, InspectionCheckItem } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const ActasView: React.FC = () => {
  const { actas, createActa, selectedBranch } = useApp();

  const [activeType, setActiveType] = useState<'recepcion' | 'entrega'>('recepcion');
  const [showNewActaModal, setShowNewActaModal] = useState(false);
  const [previewActa, setPreviewActa] = useState<ActaTecnica | null>(actas[0] || null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // New acta form state
  const [formData, setFormData] = useState({
    customerName: 'Carlos Mendoza',
    customerPhone: '+57 312 456 7890',
    motorcycle: 'Yamaha MT-07 ABS',
    plate: 'UWE-48E',
    mileage: 18500,
    fuelLevel: '3/4' as ActaTecnica['fuelLevel'],
    technicianName: 'Marcos Silva',
    observations: 'Revisión periódica de seguridad. Sin daños estructurales visibles.',
  });

  // Photographic evidences state
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultChecklist: InspectionCheckItem[] = [
    { id: '1', name: 'Estado de neumáticos y presión (del/tras)', category: 'Frenos y Neumáticos', status: 'OK' },
    { id: '2', name: 'Pastillas y discos de freno delantero/trasero', category: 'Frenos y Neumáticos', status: 'Regular' },
    { id: '3', name: 'Nivel y estado de aceite motor & refrigerante', category: 'Motor y Fluidos', status: 'OK' },
    { id: '4', name: 'Luces principales, intermitentes y luz de freno', category: 'Luces y Eléctrico', status: 'OK' },
    { id: '5', name: 'Tensión, holgura y engrase de cadena', category: 'Motor y Fluidos', status: 'Regular' },
    { id: '6', name: 'Estado de manetas, espejos y carrocería', category: 'Carrocería y Mandos', status: 'OK' },
  ];

  const [checklist, setChecklist] = useState<InspectionCheckItem[]>(defaultChecklist);

  const filteredActas = actas.filter((a) => a.type === activeType);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Request permission and start video stream
  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('El navegador o dispositivo no soporta acceso directo a la cámara.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        // Fallback if specific facingMode constraint fails
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setCameraFacingMode(facing);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            // handled
          });
        }
      }, 100);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Camera error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Permiso denegado por el dispositivo. Permite el acceso a la cámara en los ajustes del navegador o sube una imagen desde tus archivos.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('No se encontró ninguna cámara conectada en este dispositivo.');
      } else {
        setCameraError(`No se pudo acceder a la cámara: ${error.message || 'Error desconocido'}`);
      }
      setIsCameraActive(false);
    }
  };

  // Switch between front and rear cameras
  const switchCamera = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Capture still photo snapshot from live stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flash shutter animation
    setIsCapturing(true);
    setTimeout(() => setIsCapturing(false), 200);

    // Draw the camera video frame
    ctx.drawImage(video, 0, 0, width, height);

    // Add technical watermark stamp on bottom right
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(width - 320, height - 42, 310, 34);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#38bdf8';
    const timeStamp = new Date().toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    ctx.fillText(`MotoPro • ${formData.plate || 'INSP'} • ${timeStamp}`, width - 310, height - 20);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setPhotos((prev) => [...prev, dataUrl]);
  };

  // Handle manual file selection from gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotos((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    }

    e.target.value = '';
  };

  // Remove photo from captured list
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Add demo photo for testing
  const addSamplePhoto = () => {
    const demoPhotos = [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&auto=format&fit=crop&q=80',
    ];
    const randomPhoto = demoPhotos[photos.length % demoPhotos.length];
    setPhotos((prev) => [...prev, randomPhoto]);
  };

  // Clean up media stream when closing modal or unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleStatusChange = (id: string, status: InspectionCheckItem['status']) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleOpenNewActaModal = () => {
    setPhotos([]);
    setCameraError(null);
    setShowNewActaModal(true);
  };

  const handleCloseNewActaModal = () => {
    stopCamera();
    setShowNewActaModal(false);
  };

  const handleSaveActa = (e: React.FormEvent) => {
    e.preventDefault();
    stopCamera();

    const finalPhotos =
      photos.length > 0
        ? photos
        : [
            'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&auto=format&fit=crop&q=80',
          ];

    const newActa = {
      type: activeType,
      date: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toTimeString().slice(0, 5),
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      motorcycle: formData.motorcycle,
      plate: formData.plate,
      mileage: formData.mileage,
      fuelLevel: formData.fuelLevel,
      technicianName: formData.technicianName,
      branch: selectedBranch,
      observations: formData.observations,
      checklist,
      photos: finalPhotos,
      clientSignature: `${formData.customerName} (Firma Digital)`,
      technicianSignature: `${formData.technicianName} (Mecánico Responsable)`,
      status: activeType === 'recepcion' ? ('Firmada' as const) : ('Entregada' as const),
    };

    const newId = createActa(newActa);

    // Automatically preview the newly generated acta
    setPreviewActa({
      ...newActa,
      id: newId,
      actaNumber: `ACT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setShowNewActaModal(false);
  };

  return (
    <div id="actas-view" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Actas Técnicas & Inspecciones</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Documentación legal de recepción de vehículos, checklist de seguridad y actas de entrega final.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNewActaModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Generar Nueva Acta</span>
          </button>
        </div>
      </div>

      {/* Type Toggle Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveType('recepcion')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeType === 'recepcion'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Actas de Recepción (Entrada)</span>
        </button>
        <button
          onClick={() => setActiveType('entrega')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeType === 'entrega'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Actas de Entrega Conforme (Salida)</span>
        </button>
      </div>

      {/* Main Grid: Actas List & Interactive Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredActas.map((acta) => {
            const isSelected = previewActa?.id === acta.id;
            return (
              <div
                key={acta.id}
                onClick={() => setPreviewActa(acta)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-400'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-700">{acta.actaNumber}</span>
                      {acta.photos && acta.photos.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          <Camera className="w-3 h-3 text-indigo-600" />
                          {acta.photos.length} fotos
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{acta.motorcycle}</h3>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">{acta.plate}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {acta.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  <span>Cliente: {acta.customerName}</span>
                  <span>{acta.date} • {acta.time}</span>
                </div>
              </div>
            );
          })}

          {filteredActas.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No hay actas de este tipo registradas.</p>
            </div>
          )}
        </div>

        {/* Right Document Preview / Sheet (7 cols) */}
        {previewActa ? (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
            
            {/* Acta Document Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-900">
                    {previewActa.type === 'recepcion' ? 'ACTA DE RECEPCIÓN TÉCNICA' : 'ACTA DE ENTREGA DE VEHÍCULO'}
                  </span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                    {previewActa.actaNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">MotoPro Taller Central • {previewActa.branch}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>

            {/* Vehicle & Customer Data Box */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Propietario:</span>
                <p className="font-bold text-slate-900 mt-0.5">{previewActa.customerName}</p>
              </div>
              <div>
                <span className="text-slate-500">Vehículo:</span>
                <p className="font-bold text-slate-900 mt-0.5">{previewActa.motorcycle}</p>
              </div>
              <div>
                <span className="text-slate-500">Placa:</span>
                <p className="font-mono font-bold text-indigo-700 mt-0.5">{previewActa.plate}</p>
              </div>
              <div>
                <span className="text-slate-500">Kilometraje:</span>
                <p className="font-bold text-slate-900 mt-0.5">{previewActa.mileage.toLocaleString()} km</p>
              </div>
              <div>
                <span className="text-slate-500">Nivel Combustible:</span>
                <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-amber-600" />
                  {previewActa.fuelLevel}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Técnico Receptor:</span>
                <p className="font-bold text-slate-900 mt-0.5">{previewActa.technicianName}</p>
              </div>
            </div>

            {/* EVIDENCIAS FOTOGRÁFICAS VISUALIZATION */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Evidencias Fotográficas del Vehículo</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {previewActa.photos?.length || 0} {previewActa.photos?.length === 1 ? 'fotografía' : 'fotografías'}
                </span>
              </div>

              {previewActa.photos && previewActa.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {previewActa.photos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxPhoto(photoUrl)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-4/3 cursor-pointer shadow-xs hover:shadow-md transition-all"
                    >
                      <img
                        src={photoUrl}
                        alt={`Evidencia ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px]">
                        <span className="font-bold bg-slate-900/80 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-700">
                          Foto #{idx + 1}
                        </span>
                        <span className="p-1 rounded bg-white/20 backdrop-blur-xs group-hover:bg-indigo-600 transition-colors">
                          <ZoomIn className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No se registraron evidencias fotográficas para esta acta.
                </div>
              )}
            </div>

            {/* Checklist items */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Puntos de Inspección & Verificación
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Elemento Comprobado</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewActa.checklist.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.name}
                          {item.notes && <span className="block text-[10px] text-slate-500 font-normal">{item.notes}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{item.category}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'OK'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'Regular'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Replaced Parts (if delivery act) */}
            {previewActa.replacedParts && previewActa.replacedParts.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Recambios y Mano de Obra Realizada
                </h4>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5 text-xs">
                  {previewActa.replacedParts.map((rp, i) => (
                    <div key={i} className="flex justify-between font-medium">
                      <span>{rp.quantity}x {rp.name}</span>
                      <span className="font-bold">{formatCOP(rp.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observations */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block mb-1">Observaciones Técnicas:</span>
              <p className="text-slate-700 leading-relaxed">{previewActa.observations}</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-center">
                <span className="text-[10px] text-slate-500 block mb-3">Firma del Propietario / Cliente</span>
                <div className="font-serif italic text-sm text-indigo-900 font-bold border-b border-slate-300 pb-1 mx-4">
                  {previewActa.clientSignature || 'Firma Conforme'}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-center">
                <span className="text-[10px] text-slate-500 block mb-3">Firma del Mecánico Responsable</span>
                <div className="font-serif italic text-sm text-indigo-900 font-bold border-b border-slate-300 pb-1 mx-4">
                  {previewActa.technicianSignature || 'Firma Mecánico'}
                </div>
              </div>
            </div>

          </div>
        ) : null}

      </div>

      {/* Lightbox Modal for Photo Zoom */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold">Evidencia Fotográfica de Inspección</span>
              </div>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-[320px] max-h-[75vh] overflow-hidden">
              <img
                src={lightboxPhoto}
                alt="Evidencia en grande"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
              <span>Registro fotográfico pericial MotoPro</span>
              <a
                href={lightboxPhoto}
                download="evidencia-vehiculo.jpg"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors"
                target="_blank"
                rel="noreferrer"
              >
                Abrir Original
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Generar Nueva Acta con Cámara & Evidencias */}
      {showNewActaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Generar Acta de {activeType === 'recepcion' ? 'Recepción (Entrada)' : 'Entrega (Salida)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Inspección técnica con captura de evidencias fotográficas en vivo.
                </p>
              </div>
              <button
                onClick={handleCloseNewActaModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActa} className="mt-4 space-y-4 text-xs">
              
              {/* Customer details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Vehicle details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Motocicleta (Marca/Modelo)</label>
                  <input
                    type="text"
                    required
                    value={formData.motorcycle}
                    onChange={(e) => setFormData({ ...formData, motorcycle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Placa del Vehículo</label>
                  <input
                    type="text"
                    required
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kilometraje Actual</label>
                  <input
                    type="number"
                    required
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* DIV DE EVIDENCIAS FOTOGRÁFICAS DEL VEHÍCULO CON CÁMARA */}
              <div
                id="evidencias-fotograficas-container"
                className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3.5 shadow-md"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        Evidencias Fotográficas del Vehículo
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Fotografías del estado de carrocería, daños previos o cuentakilómetros
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                      {photos.length} {photos.length === 1 ? 'foto guardada' : 'fotos guardadas'}
                    </span>
                  </div>
                </div>

                {/* Camera Permission Error Notice */}
                {cameraError && (
                  <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">{cameraError}</p>
                      <p className="text-[11px] text-rose-300/80 mt-0.5">
                        Si has denegado el permiso, puedes habilitarlo en el icono de candado/cámara de la barra de direcciones o utilizar el botón de subir archivos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCameraError(null)}
                      className="text-rose-400 hover:text-white font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Live Camera Viewfinder Stream */}
                {isCameraActive ? (
                  <div className="relative rounded-xl overflow-hidden bg-black border border-slate-700 shadow-inner">
                    {/* Shutter flash animation */}
                    {isCapturing && (
                      <div className="absolute inset-0 bg-white z-30 transition-opacity duration-200 opacity-90" />
                    )}

                    {/* Video Stream Element */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 sm:h-80 object-cover bg-black"
                    />

                    {/* Inspection HUD Target Overlay */}
                    <div className="absolute inset-0 pointer-events-none border-2 border-indigo-400/30 m-3 rounded-lg flex items-center justify-center">
                      <div className="w-8 h-8 border-t-2 border-l-2 border-indigo-400 absolute top-2 left-2" />
                      <div className="w-8 h-8 border-t-2 border-r-2 border-indigo-400 absolute top-2 right-2" />
                      <div className="w-8 h-8 border-b-2 border-l-2 border-indigo-400 absolute bottom-2 left-2" />
                      <div className="w-8 h-8 border-b-2 border-r-2 border-indigo-400 absolute bottom-2 right-2" />
                      <div className="text-[10px] text-indigo-300 bg-black/70 px-2.5 py-1 rounded font-mono border border-indigo-500/30">
                        MODO INSPECCIÓN • {formData.plate || 'SIN PLACA'}
                      </div>
                    </div>

                    {/* Floating Camera Actions Bar */}
                    <div className="absolute bottom-3 left-0 right-0 px-4 flex items-center justify-between z-20">
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white hover:bg-slate-800 border border-slate-700 transition-colors shadow-lg"
                        title="Cambiar cámara (Frontal / Trasera)"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {/* Large Center Shutter Button */}
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="w-14 h-14 rounded-full bg-white text-indigo-900 hover:bg-slate-100 flex items-center justify-center shadow-xl shadow-indigo-500/40 border-4 border-indigo-500 active:scale-90 transition-all cursor-pointer"
                        title="Tomar Foto"
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-600" />
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-2.5 rounded-full bg-rose-600/90 backdrop-blur-md text-white hover:bg-rose-700 border border-rose-500 transition-colors shadow-lg"
                        title="Detener Cámara"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons when Camera is Idle */
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => startCamera(cameraFacingMode)}
                        className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/30 transition-all active:scale-98"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Abrir Cámara (Pedir Permiso)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                      >
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span>Subir desde Galería / Archivo</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>¿Sin dispositivo de cámara conectado?</span>
                      <button
                        type="button"
                        onClick={addSamplePhoto}
                        className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                      >
                        + Cargar foto de demostración
                      </button>
                    </div>
                  </div>
                )}

                {/* Thumbnails of Captured Evidences */}
                {photos.length > 0 && (
                  <div className="pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Fotos capturadas para guardar en esta acta:
                      </p>
                      <button
                        type="button"
                        onClick={() => setPhotos([])}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                      >
                        Eliminar todas
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {photos.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-square bg-slate-800"
                        >
                          <img
                            src={imgUrl}
                            alt={`Evidencia ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setLightboxPhoto(imgUrl)}
                              className="p-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                              title="Ver en grande"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="absolute bottom-1 left-1 text-[9px] bg-black/80 text-white px-1 rounded font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Checklist inputs */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Checklist de Inspección de Seguridad:
                </label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-xs bg-white p-2 rounded-lg border border-slate-200/80">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <div className="flex items-center gap-1">
                        {(['OK', 'Regular', 'Dañado'] as InspectionCheckItem['status'][]).map((st) => (
                          <button
                            type="button"
                            key={st}
                            onClick={() => handleStatusChange(item.id, st)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                              item.status === st
                                ? st === 'OK'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'Regular'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones Finales del Mecánico</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Detalles sobre roces, estado de pintura, accesorios montados, etc."
                />
              </div>

              {/* Form submit & cancel */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseNewActaModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emitir y Validar Acta ({photos.length} fotos)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

