'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExplainResponse } from '@/lib/types';

export default function ExplainPage() {
  const [txHash, setTxHash] = useState('');
  const [network, setNetwork] = useState('mainnet-beta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(
        `${apiUrl}/explain/${txHash.trim()}?network=${network}`
      );

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

  const copyShareLink = () => {
    if (result?.shareUrl) {
      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Transaction Explainer</h1>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Transaction Hash</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Enter Solana transaction signature..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Network</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="mainnet-beta">Mainnet Beta</option>
              <option value="devnet">Devnet</option>
              <option value="testnet">Testnet</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !txHash.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium"
          >
            {loading ? 'Analyzing...' : 'Explain Transaction'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {result && (
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
        )}
      </div>
    </div>
  );
}