import React from 'react';

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);

const RetryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);


interface JwtErrorHelpProps {
  onRetry: () => void;
}


const JwtErrorHelp: React.FC<JwtErrorHelpProps> = ({ onRetry }) => {
  return (
    <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-4 rounded-lg relative mb-6" role="alert">
      <h3 className="font-bold text-lg mb-2 flex items-center">
        <HelpIcon />
        Backend Authentication Error: Invalid JWT Signature
      </h3>
      <p className="mb-3">
        This is a common configuration error on your Vercel backend. It means the private key used to authenticate with Google Cloud is either incorrect or badly formatted. Your frontend code is working correctly, but the backend server is being blocked by Google.
      </p>
      <p className="font-semibold mb-2 text-yellow-100">How to Fix:</p>
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li>
          <strong>Generate a New Key:</strong> Go to the <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">Google Cloud IAM & Admin &rarr; Service Accounts</a> page.
        </li>
        <li>
          Select your project, find the service account your backend is using, click on it, go to the "Keys" tab, and click "Add Key" &rarr; "Create new key". Choose JSON and download the file.
        </li>
        <li>
          <strong>Copy the Entire Key:</strong> Open the downloaded JSON file. Find the <code>private_key</code> field. Carefully copy its entire value, starting from <code>-----BEGIN PRIVATE KEY-----</code> all the way to <code>-----END PRIVATE KEY-----\n</code>.
        </li>
        <li>
          <strong>Update Vercel Environment Variable:</strong> Go to your Vercel project dashboard. Navigate to Settings &rarr; Environment Variables. Find your private key variable (e.g., <code>GOOGLE_PRIVATE_KEY</code>).
        </li>
        <li>
          <strong>Paste Correctly:</strong> Delete the old value and paste the new key you just copied. Vercel's UI should handle the multi-line format automatically.
        </li>
        <li>
          <strong>Redeploy:</strong> After saving the new environment variable, you must trigger a new deployment on Vercel for the change to take effect. Go to your project's "Deployments" tab and redeploy the latest commit.
        </li>
      </ol>
        <div className="mt-4 p-3 bg-gray-900 rounded-md border border-gray-600">
            <p className="text-xs font-semibold text-gray-300 mb-1">Example of Correct Formatting in Vercel:</p>
            <p className="font-mono text-xs bg-black p-2 rounded whitespace-pre-wrap text-green-400">
                {`-----BEGIN PRIVATE KEY-----\\n...your long key content...\\n-----END PRIVATE KEY-----\\n`}
            </p>
            <p className="text-xs text-yellow-400 mt-2">
                The entire block, including the `BEGIN`/`END` lines and the `\\n` characters, must be part of the variable value.
            </p>
      </div>

      <div className="mt-6">
        <button
          onClick={onRetry}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <RetryIcon />
          I've fixed my backend & redeployed. Try Again.
        </button>
      </div>

    </div>
  );
};

export default JwtErrorHelp;
