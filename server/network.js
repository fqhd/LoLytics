export default function send_server_error(res) {
    res.status(500).json({ error: 'Internal Server Error' });
}
