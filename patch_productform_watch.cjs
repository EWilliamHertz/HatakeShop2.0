const fs = require('fs');
let content = fs.readFileSync('src/components/ProductForm.tsx', 'utf-8');

content = content.replace(
  'const { register, control, handleSubmit, formState: { errors } } = useForm<any>({',
  'const { register, watch, control, handleSubmit, formState: { errors } } = useForm<any>({'
);

content = content.replace(
  'control._formValues.offersOem',
  'watch("offersOem")'
).replace(
  'control._formValues.offersOem',
  'watch("offersOem")'
).replace(
  '!control._formValues.offersOem',
  '!watch("offersOem")'
);

fs.writeFileSync('src/components/ProductForm.tsx', content);
console.log("Patched ProductForm watch");
