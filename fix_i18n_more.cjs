const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf8');

const newTranslations = `
      "Product Catalog": "产品目录",
      "Contact Seller": "联系卖家",
      "Verified": "已验证",
      "Active Listings": "有效商品",
      "Company Members": "公司成员",
      "Invite vendors and buyers to Hatake.Shop and earn a 1% commission on their lifetime Gross Merchandise Value (GMV).": "邀请供应商和买家加入 Hatake.Shop，并从其终身销售总额 (GMV) 中赚取 1% 的佣金。",
      "Your Unique Invite Link": "您的专属邀请链接",
      "Copy Link": "复制链接",
      "Referred Partners": "推荐合作伙伴",
      "Network GMV": "网络总交易额",
      "Commission Earned": "赚取佣金",
`;
code = code.replace('"Company Overview": "公司概览",', '"Company Overview": "公司概览",' + newTranslations);
fs.writeFileSync('src/i18n.ts', code);
