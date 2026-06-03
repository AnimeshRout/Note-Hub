import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export const configurePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find existing user by googleId or email
          let user = await User.findOne({
            $or: [
              { googleId: profile.id },
              { email: profile.emails?.[0]?.value },
            ],
          });

          if (user) {
            // Update googleId if not set
            if (!user.googleId) {
              user.googleId = profile.id;
              user.isVerified = true;
              if (!user.avatar) {
                user.avatar = profile.photos?.[0]?.value || '';
              }
              await user.save();
            }
          } else {
            // Create new user
            user = await User.create({
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value || '',
              isVerified: true,
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};
