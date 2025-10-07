import React from 'react';
import './PurchasePath.css';

export default function PurchasePath({ items, frameIndex }) {
  const visibleItems = items.filter(block => block.time < frameIndex);

  return (
    <div className="purchase-path">
      {visibleItems.map((block, i) => (
        <React.Fragment key={i}>
          <div className="item-group">
            {block.items.map((item, j) => (
              <div className="item" key={j}>
                <img
                  className="item-icon"
                  src={`/images/items/${item.id}.jpg`}
                  alt=""
                />
                {item.count > 1 && (
                  <p className="item-count">{item.count}</p>
                )}
              </div>
            ))}
            <p className="item-time">{block.time}:00</p>
          </div>

          {i < visibleItems.length - 1 && (
            <img
              className="purchase-arrow"
              src="/images/arrow.png"
              alt="arrow"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
