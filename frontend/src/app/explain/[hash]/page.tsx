'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { ExplainResponse } from '@/lib/types';

export default function ExplainHashPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResponse | null>(null);

  useEffect(() => {
    if (!hash) return;

    const fetchExplanation = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/explain/${hash}?network=mainnet-beta`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Failed to fetch transaction');
        }

        const data: ExplainResponse = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [hash]);

  const copyShareLink = () => {
    if (result?.shareUrl) {
      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Transaction Explainer</h1>

        <div className="space-y-6">
          <div className="p-6 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Result</h2>
              <span className="px-3 py-1 bg-gray-700 rounded text-sm">
                {result.network}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Transaction Hash</h3>
                <p className="font-mono text-sm break-all">{result.hash}</p>
              </div>

              {result.errorCode && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Error Code</h3>
                  <p className="font-mono text-sm text-red-400">{result.errorCode}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-400">What Happened</h3>
                <p>{result.plainEnglish}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400">How to Fix</h3>
                <p>{result.fixSuggestion}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Risk Level</h3>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    result.riskLevel === 'High' ? 'bg-red-900 text-red-200' :
                    result.riskLevel === 'Medium' ? 'bg-yellow-900 text-yellow-200' :
                    'bg-green-900 text-green-200'
                  }`}>
                    {result.riskLevel}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Economic Context</h3>
                  <p className="text-sm text-gray-300">{result.economicContext}</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                >
                  Copy Share Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}