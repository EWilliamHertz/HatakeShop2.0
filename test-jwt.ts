import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
const token = jwt.sign({ uid: 'uJjvZKedn0MBrz75w6bd9Az8P0H3' }, 'secret');
console.log(token);
