import './tradingview.scss';

const TradingView = () => (
    <div className='tradingview-page'>
        <iframe
            className='tradingview-page__iframe'
            src='https://charts.deriv.com/deriv'
            title='TradingView'
            allow='fullscreen'
        />
    </div>
);

export default TradingView;
