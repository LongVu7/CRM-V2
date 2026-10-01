const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const prisma = require('./db');

module.exports = (passport) => {
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const account = await prisma.account.findFirst({
          where: { email },
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } }
              }
            },
            group: {
              include: {
                permissions: { include: { permission: true } }
              }
            }
          }
        });

        if (!account) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!account.isActive) {
          return done(null, false, { message: 'Account is deactivated' });
        }

        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, account);
      } catch (error) {
        return done(error);
      }
    }
  ));
};
