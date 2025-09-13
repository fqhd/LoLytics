import React from 'react';
import './PurchasePath.css';

export default function PurchasePath({ items }) {
    return (
        <div className="purchase-path">
            {items.map((block, i) => {
                return <div className='item-group' key={i}>
                    {
                        block.items.map((item, j) => (<img key={j} className='item-icon' src={`/images/items/${item.id}.jpg`} />))
                    } 
                </div>
            })}
        </div>
    );
}
