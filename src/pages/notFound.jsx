import React from "react";

const NotFound = () => {
    return (
        <main style={{ display: 'flex', maxHeight: '100vh', width: '100%', flexDirection: 'row' }}>
            <div style={{ width: '50%' }}>
                <img src='images/questionmark.avif' alt='Error 404' 
                style={{ height: '100vh', width: '100%', marginInline: 'auto', objectFit: 'conrtain' }} />
            </div>
            <div style={{ width: '50%', alignItems: 'center', justifyContent: 'center', display: 'flex', 
                        flexDirection: 'column', gap: '1rem', backgroundColor: '#fff' }}>
                <h1 style={{ fontSize: '1.875rem' }}>
                    <span style={{ color: 'red' }}>Page not found!</span>
                </h1>
                <p style={{ fontSize: '1.25rem' }}>The page you are looking for does not exist.</p>
                <p style={{ fontSize: '1.25rem' }}> Check your URL or contact admin.</p>
            </div>
        </main>
    );
}

export default NotFound;
