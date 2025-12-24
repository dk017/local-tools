export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-6 py-32 max-w-3xl">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
            <div className="prose prose-invert">
                <p>Last updated: {new Date().toLocaleDateString()}</p>
                <p>At Local Tools, privacy is our core feature. We simply do not collect your files. Period.</p>
                <h3>1. Data Collection</h3>
                <p>The Application processes files locally on your device. No files are uploaded to our servers.</p>
                <h3>2. Analytics</h3>
                <p>We may collect anonymous usage statistics to improve the app (e.g., &quot;PDF Merge tool used&quot;), but never the content of your files.</p>
                <h3>3. Contact</h3>
                <p>For questions, contact support@localtools.com</p>
            </div>
        </div>
    );
}
