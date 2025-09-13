import React from 'react';
import './PurchasePath.css';

export default function PurchasePath({ items }) {
    return (
        <div className="purchase-path">
            {items.map((block, i) => {
                return <div className='item-group' key={i}>
                    {
                        block.items.map((item, j) => (
                            <React.Fragment key={j}>
                                <img className='item-icon' src={`/images/items/${item.id}.jpg`} />
                                {item.count > 1 && <p className='item-count'>{item.count}</p>}
                            </React.Fragment>
                        ))
                    }
                    <p className='item-time'>{block.time}:00</p>
                </div>
            })}
        </div>
    );
}
