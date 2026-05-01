"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PhoneSettingsProps {
  userId: string;
}

export default function PhoneNumberSettings({ userId }: PhoneSettingsProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchPhoneNumber = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/phone-number`);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        setPhoneNumber(data.phone_number || "");
      } catch (err: any) {
        console.error("Error fetching phone number:", err);
        setError("Gagal mengambil nomor telepon");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPhoneNumber();
    }
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      if (!phoneNumber.trim()) {
        throw new Error("Nomor telepon tidak boleh kosong");
      }

      const response = await fetch(`/api/users/${userId}/phone-number`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update phone number");
      }

      setMessage("✅ Nomor WhatsApp berhasil disimpan!");
      setPhoneNumber(data.phone_number);

      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">📱 Atur Nomor WhatsApp</h3>

      <p className="text-sm text-gray-600 mb-4">
        Isi nomor WhatsApp Anda untuk menerima reminder mengisi mood tracking
        setiap hari.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nomor WhatsApp
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+62812345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: +62812345678 (dengan kode negara)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Menyimpan..." : "Simpan Nomor"}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Notifikasi akan dikirim pukul 08:00 setiap hari</li>
          <li>• Pastikan WhatsApp Anda aktif dan online</li>
          <li>• Nomor hanya disimpan untuk reminder</li>
          <li>• Anda bisa mengubah nomor kapan saja</li>
        </ul>
      </div>
    </div>
  );
}
