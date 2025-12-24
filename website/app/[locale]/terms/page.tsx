export default function Terms() {
    return (
        <div className="container mx-auto px-6 py-32 max-w-3xl">
            <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
            <div className="prose prose-invert">
                <p>Last updated: {new Date().toLocaleDateString()}</p>
                <h3>1. License</h3>
                <p>By purchasing a license, you are granted a non-exclusive, non-transferable right to use the software indefinitely.</p>
                <h3>2. Refunds</h3>
                <p>We offer a 14-day money-back guarantee if the software does not work on your device.</p>
            </div>
        </div>
    );
}
