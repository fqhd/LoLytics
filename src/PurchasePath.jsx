import React from 'react';
import './PurchasePath.css';

export default function PurchasePath({ iconPaths }) {
    return (
        <div className="purchase-path">
            {iconPaths.map((path, index) => (
                <React.Fragment key={index}>
                    <img className="item-icon" src={path} alt={`Item ${index + 1}`} />
                </React.Fragment>
            ))}
        </div>
    );
}
