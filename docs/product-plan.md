# Dating Application
## Complete Product, Business, Technology & Deployment Plan

**Document type:** Product and Technical Planning Document  
**Initial launch market:** Chennai, India  
**Future expansion:** India and international markets  
**Target audience:** Adults aged 25–40  
**Minimum eligible age:** 18 years  
**Initial infrastructure:** AWS EC2 + S3 + Firebase Cloud Messaging  
**Development status:** Planning and validation phase

---

# 1. Executive Summary

The objective is to build a modern dating and social discovery application that helps people discover compatible individuals, connect with others and build meaningful relationships.

The application will support both casual dating and serious relationships.

The initial launch will focus on Chennai, allowing us to validate the product in a concentrated geographic market before expanding to other Indian cities and international markets.

The product will combine:

- Swipe-based profile discovery.
- Personalized profile recommendations.
- City and locality-based discovery.
- Premium GPS-based nearby discovery.
- Mutual matching.
- Real-time messaging.
- Relationship intention preferences.
- Compatibility insights.
- Profile verification.
- Safety and moderation.
- Subscription-based monetization.

The application will follow a freemium business model. Users can browse and interact with a limited daily number of likes for free, while Premium unlocks additional discovery and interaction features.

The technical architecture will use AWS for the core backend infrastructure and Firebase Cloud Messaging for mobile push notifications.

The initial deployment will run the backend, PostgreSQL, PostGIS, Redis and background workers on a single EC2 instance to control infrastructure costs.

## Primary objectives

1. Build a reliable dating application.
2. Establish a concentrated user base in Chennai.
3. Validate demand before investing heavily in development and marketing.
4. Build a sustainable subscription business.
5. Maintain strong user privacy and safety.
6. Create an architecture that can scale across cities and countries.

---

# 2. Product Positioning

## 2.1 Product category

Dating and social discovery platform.

## 2.2 Target audience

Primary target audience:

- Adults aged 25–40.
- Working professionals.
- Young entrepreneurs.
- People looking for casual dating.
- People looking for serious relationships.
- People interested in meeting new individuals nearby.

The application will not restrict registration to the 25–40 target segment. All eligible adults aged 18 and above may register, subject to the platform's discovery and preference rules.

## 2.3 Relationship intentions

Users should be able to select their relationship preferences.

Options:

1. Serious relationship.
2. Casual dating.
3. Open to both.
4. Still figuring it out.

Relationship intention should be visible on profiles and available as a discovery preference.

The recommendation system should avoid repeatedly recommending profiles with incompatible relationship expectations.

## 2.4 Initial geographical market

Initial launch: Chennai, Tamil Nadu.

Potential initial areas for research and pilot recruitment:

- Anna Nagar.
- Adyar.
- Velachery.
- OMR.
- T. Nagar.
- Porur.

After validating the Chennai market, expand to other metropolitan cities.

Potential expansion:

- Bengaluru.
- Hyderabad.
- Mumbai.
- Pune.
- Delhi NCR.
- Coimbatore.
- Trichy.

International expansion should be considered only after the Indian product has established reliable operations.

---

# 3. User Experience and Discovery Model

The application will combine two discovery experiences.

## 3.1 Swipe discovery

Users see one profile at a time.

Available actions:

- Like.
- Pass.
- Open profile details.
- View photographs.
- Read profile prompts.
- View relationship intentions.
- View interests and compatibility information.
- Report profile.
- Block profile.

A mutual like creates a match.

## 3.2 Recommendation feed

In addition to swipe discovery, users can receive a recommendation feed.

The feed can consider:

- Age preferences.
- Gender preferences.
- Orientation and discovery preferences.
- Relationship intention.
- Shared interests.
- Lifestyle compatibility.
- Profile completeness.
- Recent activity.
- Location preferences.
- Previous interaction history.

The recommendation system should not simply show the nearest person. Compatibility, user preferences and safety must remain important.

## 3.3 Discovery eligibility

A profile should only appear when:

- The account is active.
- The account is eligible for discovery.
- The user has not blocked the other person.
- The other person has not blocked the user.
- The profile satisfies relevant age and discovery preferences.
- The profile is not suspended or restricted.
- The profile satisfies relationship preference rules where applicable.

---

# 4. Free and Premium Subscription Model

The platform will follow a freemium model.

## 4.1 Free plan

Price: ₹0.

Features:

- Account registration.
- Profile creation.
- Profile photographs.
- Profile editing.
- Browse profiles.
- Unlimited passing and rejecting.
- Swipe discovery.
- 20 likes per day.
- Basic profile information.
- Basic compatibility information.
- City selection.
- Manual city and locality search.
- Receive match notifications.
- Access existing matches.
- Access existing conversations.
- Basic messaging.
- Block and report.
- Account deletion.
- Core safety and privacy settings.

### Daily like restriction

Free users receive 20 likes per day.

Once the daily allowance is exhausted:

- The Like action becomes disabled.
- Users can continue browsing.
- Users can continue passing profiles.
- Existing matches remain accessible.
- Existing chats remain accessible.
- Users can upgrade to Premium.

The quota must be enforced by the backend.

The daily quota should reset according to a consistent server-side reset period, preferably midnight in the user's configured timezone.

## 4.2 Premium plan

Premium unlocks additional discovery capabilities.

Features:

- Unlimited likes, subject to fair-use and anti-spam controls.
- GPS-based nearby discovery.
- Nearby-first profile ranking.
- Custom discovery radius.
- See who liked you.
- Advanced filters.
- Compatibility insights.
- Incognito mode.
- Travel discovery.
- Additional discovery preferences.

### Nearby discovery

Nearby discovery is a Premium feature.

Premium users can select a discovery radius:

- 1 km.
- 3 km.
- 5 km.
- 10 km.
- 25 km.
- 50 km.
- 100 km.
- Any distance.

The backend will calculate distance using PostGIS.

Exact GPS coordinates must never be exposed to other users.

Only approximate distance information should be displayed where appropriate.

### Important location distinction

Free users can manually search by city or locality.

Premium users additionally receive:

- GPS-based nearby discovery.
- Radius-based filtering.
- Nearby-first recommendations.
- Distance-based discovery ranking.

Manual search location and actual device GPS location must remain separate.

## 4.3 Proposed subscription pricing

These prices are initial experiments and have not yet been validated through actual customer payments.

| Plan | Price | Duration |
|---|---:|---|
| Free | ₹0 | Unlimited |
| Daily Premium | ₹20 | 24 hours |
| Weekly Premium | ₹99 | 7 days |
| Monthly Premium | ₹299 | 30 days |
| Quarterly Premium | ₹749 | 90 days |
| Annual Premium | ₹1,999 | 365 days |

Daily Premium should be a one-time 24-hour pass, not an automatically recurring daily charge.

All subscription entitlements must be checked by the backend.

Payment processing, subscription renewal, cancellation, refunds and payment verification must be implemented securely.

---

# 5. Complete Application Feature Catalogue

## Module 1: Authentication and Account Management

Features:

- Phone number registration.
- Email registration.
- OTP verification.
- Google login.
- Apple login.
- Secure login sessions.
- Password recovery where applicable.
- Logout.
- Account deletion.
- Session management.
- Device management.
- Age eligibility checks.
- Suspended account handling.

Minimum age: 18 years.

Age verification should not rely solely on a user entering a date of birth. Risk-based age assurance and additional checks should be considered.

## Module 2: User Onboarding

Collect the minimum information required to create a useful profile.

Fields:

- Name or display name.
- Date of birth.
- Gender.
- Orientation and discovery preferences.
- Preferred languages.
- Country.
- State.
- City.
- Locality.
- Relationship intention.
- Interests.
- Lifestyle preferences.
- Short biography.
- Optional education.
- Optional profession.

The onboarding process should be simple and progressive.

Avoid forcing users to complete every optional field before they can explore the application.

## Module 3: Profile Management

Features:

- Profile photograph upload.
- Multiple photographs.
- Photograph ordering.
- Profile biography.
- Profile prompts.
- Interests.
- Relationship intentions.
- Lifestyle information.
- Profile completion indicator.
- Profile preview.
- Visibility settings.
- Verification status.
- Profile editing.

Potential later features:

- Voice introductions.
- Additional profile prompts.
- Short profile videos, subject to moderation and cost evaluation.

## Module 4: Location Management

Features:

- Manual country selection.
- State selection.
- City selection.
- Locality selection.
- GPS permission.
- Premium nearby discovery.
- Premium radius filtering.
- Approximate distance display.
- Travel discovery.
- Location privacy controls.

Location must be collected with clear user consent.

Do not expose precise coordinates in APIs, profile responses or public database queries.

## Module 5: Discovery and Recommendations

Features:

- Swipe cards.
- Recommendation feed.
- Like.
- Pass.
- Profile detail view.
- Advanced filters.
- Recently active profiles.
- Compatibility insights.
- Nearby recommendations for Premium.
- City-based discovery.
- Relationship intention filtering.
- Exclusion of blocked accounts.
- Exclusion of previously passed or otherwise ineligible profiles where appropriate.

The recommendation engine should initially be rule-based.

Machine learning can be introduced later when sufficient interaction data exists.

## Module 6: Likes

Features:

- Send likes.
- Record incoming likes.
- Daily free like quota.
- Unlimited Premium likes subject to fair use.
- Like history.
- Like notifications.
- Prevent duplicate likes.
- Prevent likes after blocking.

Premium users can see who liked them.

Free users should not be given unrestricted access to the full incoming-likes list.

## Module 7: Matching

A match is created when two eligible users like each other.

Features:

- Mutual-like detection.
- Match creation.
- Match notifications.
- Match history.
- Unmatch.
- Remove match.
- Block after matching.
- Report from match screen.

The backend must prevent duplicate match creation.

## Module 8: Messaging

Initial messaging features:

- Text messages.
- Message history.
- Message timestamps.
- Delivery status.
- Optional read receipts.
- Typing indicators.
- Online status controls.
- Conversation list.
- Message notifications.
- Block and report from chat.
- Moderation of uploaded media.

Future features:

- Voice messages.
- Audio calls.
- Video calls.
- Additional rich media.

Audio and video calling should not be part of the initial MVP because of additional infrastructure, moderation and operational costs.

## Module 9: Compatibility System

The compatibility system should help users understand why a recommendation may be relevant.

Potential compatibility dimensions:

- Relationship intentions.
- Lifestyle.
- Personality.
- Interests.
- Communication preferences.
- Location preferences.

An illustrative starting model could be:

| Dimension | Initial proposed weight |
|---|---:|
| Relationship intentions | 25% |
| Lifestyle | 20% |
| Personality | 20% |
| Interests | 15% |
| Communication | 10% |
| Proximity | 10% |

These weights are hypotheses, not validated scientific measurements.

Do not present compatibility scores as scientifically proven predictions.

Start with transparent, understandable matching rules.

## Module 10: Verification and Trust

Features:

- Profile verification.
- Selfie verification.
- Liveness verification where appropriate.
- Profile photo moderation.
- Suspicious account detection.
- Duplicate account detection.
- Spam detection.
- Verification status.
- Verification review.
- Appeals.

Verification should be introduced with appropriate privacy protections and clear data-retention policies.

## Module 11: Safety and Moderation

Safety must remain available to all users, including Free users.

Features:

- Block user.
- Report user.
- Report photographs.
- Report messages.
- Unmatch.
- Hide profile.
- Account suspension.
- Account banning.
- Moderation dashboard.
- Appeal handling.
- Safety guidance.
- Suspicious behaviour detection.
- Audit logs.

Moderators should not have unrestricted access to private conversations.

Access to private messages for a safety investigation should be case-based, permission-controlled and audited.

## Module 12: Notifications

Notification events:

- New like.
- New match.
- New message.
- Verification result.
- Subscription purchase.
- Subscription expiry.
- Daily likes reset.
- Security alert.
- Important account notification.

Notification preferences should allow users to control non-essential notifications.

## Module 13: Subscription and Payments

Features:

- Subscription plans.
- Pricing display.
- Upgrade.
- Payment checkout.
- Payment confirmation.
- Subscription entitlement.
- Subscription expiry.
- Cancellation.
- Renewal.
- Failed payment handling.
- Refund workflow.
- Payment history.
- Restore purchases where required.

Payment providers such as Razorpay or Stripe can be integrated.

The final provider should be selected based on supported countries, fees, payment methods and mobile app store requirements.

## Module 14: Admin Dashboard

The admin dashboard is essential.

Features:

1. Admin login.
2. Role-based permissions.
3. User search.
4. User account details.
5. Account suspension.
6. Account banning.
7. Profile moderation.
8. Photo moderation.
9. Verification management.
10. Report management.
11. Appeal management.
12. Subscription management.
13. Payment monitoring.
14. City-wise user analytics.
15. Discovery analytics.
16. User activity analytics.
17. Notification management.
18. CMS management.
19. Customer support.
20. Audit logs.

Sensitive admin actions must be recorded.

## Module 15: Marketing Website

The website should contain:

- Landing page.
- Product introduction.
- How it works.
- Pricing.
- Safety information.
- Frequently asked questions.
- Contact page.
- Terms and conditions.
- Privacy policy.
- Community guidelines.
- Account deletion instructions.
- App download links.

## Module 16: Future Features

Do not build all of these initially.

Potential future features:

- AI dating assistant.
- AI profile improvement suggestions.
- Voice introductions.
- Audio calling.
- Video calling.
- Social events.
- Interest-based groups.
- Social activity feed.
- Virtual gifts.
- International currencies.
- Multiple languages.
- Advanced AI recommendations.
- Advanced compatibility analysis.

---

# 6. Technical Architecture

## 6.1 Overall architecture

The initial platform will use a modular monolith.

This means the backend is one deployable application, internally divided into clear modules.

It is preferable to starting with many microservices.

### Application layers

1. Mobile application.
2. API and backend.
3. Authentication.
4. Business logic.
5. Database.
6. Cache.
7. Background processing.
8. Media storage.
9. Notifications.
10. Administration.

## 6.2 Mobile application

Technology:

- React Native.
- Expo.
- TypeScript.
- React Navigation.
- Zustand.
- TanStack Query.

Purpose:

- Single application codebase.
- Android and iOS support.
- API integration.
- Profile discovery.
- Messaging interface.
- Subscription interface.
- Push notification handling.

## 6.3 Backend

Technology:

- Python.
- FastAPI.
- SQLAlchemy.
- Alembic.
- Pydantic.
- Docker.

Responsibilities:

- Authentication integration.
- Profile management.
- Discovery.
- Likes.
- Matching.
- Messaging.
- Subscription management.
- Location queries.
- Moderation.
- Notifications.

## 6.4 Database

Technology: PostgreSQL with PostGIS.

Data stored:

- Users.
- Profiles.
- Photographs metadata.
- Preferences.
- Relationship intentions.
- Likes.
- Passes.
- Matches.
- Conversations.
- Messages.
- Subscriptions.
- Payments.
- Reports.
- Verification records.
- Audit logs.

PostGIS will support:

- Geographic coordinates.
- Nearby search.
- Radius queries.
- Distance calculations.
- Spatial indexes.

Use GiST indexes and suitable geographic queries.

## 6.5 Redis

Responsibilities:

- Frequently accessed data.
- Caching.
- Rate limiting.
- Temporary session data where appropriate.
- Background job coordination.
- Real-time presence where needed.

Redis should not become the permanent source of truth for important user data.

## 6.6 Background processing

Use Celery initially.

Potential jobs:

- Email notifications.
- Push notifications.
- Image processing.
- Profile moderation tasks.
- Daily like quota reset.
- Subscription expiry.
- Cleanup tasks.
- Analytics processing.

SQS can be introduced for reliable asynchronous task delivery when needed. Avoid adding both SQS and Redis queues unnecessarily at the start.

## 6.7 Media storage

Use Amazon S3.

Store:

- Profile photographs.
- Thumbnails.
- User-uploaded media.
- Moderation evidence where retention is legally justified.

Do not store image files directly in PostgreSQL.

Use:

- Compressed image formats.
- Multiple image sizes.
- Private buckets.
- Signed URLs.
- Access controls.
- Upload validation.
- File size limits.

CloudFront can be introduced for image delivery when traffic justifies it.

---

# 7. AWS Infrastructure and Services

The platform will use AWS as its primary cloud provider.

## 7.1 AWS EC2

EC2 will host the initial application.

Proposed instance:

- Instance: t3.medium.
- CPU: 2 vCPUs.
- Memory: 4 GB.
- Operating system: Linux.
- Storage: 50 GB EBS.
- Region: Mumbai, ap-south-1.

The server will run:

- Nginx.
- FastAPI.
- PostgreSQL.
- PostGIS.
- Redis.
- Celery workers.
- Docker Compose.

This is a cost-saving pilot configuration, not a highly available production configuration.

## 7.2 Amazon S3

Used for:

- Profile images.
- Thumbnails.
- Media files.
- Database backup storage.

Use private buckets and controlled access.

## 7.3 Firebase Cloud Messaging

FCM will handle mobile push notifications.

Examples:

- New likes.
- New matches.
- New messages.
- Subscription notifications.

Firebase is being used only for push notifications initially.

The application backend and database will remain on AWS.

## 7.4 Amazon SES

Used for:

- Account emails.
- Verification emails.
- Security alerts.
- Subscription emails.

## 7.5 Amazon CloudWatch

Used for:

- Server monitoring.
- Application logs.
- CPU monitoring.
- Memory monitoring through an appropriate agent.
- Error alerts.
- Billing and operational alarms.

## 7.6 Amazon Cognito

Potentially used for authentication.

Responsibilities:

- User identity.
- Authentication tokens.
- Login integration.
- Social authentication integration.

Cognito and the backend should be configured so that the backend independently verifies authentication tokens and authorization.

## 7.7 Amazon SQS

Optional initial service.

Can support:

- Notification delivery.
- Background processing.
- Retry handling.
- Reliable asynchronous tasks.

For the smallest pilot, Celery with Redis may be sufficient. Introduce SQS when operational requirements justify it.

---

# 8. Single EC2 Deployment Architecture

The initial deployment will run all core backend components on one EC2 instance.

### Container arrangement

Docker Compose will manage:

1. Nginx.
2. FastAPI.
3. PostgreSQL.
4. Redis.
5. Celery worker.
6. Celery scheduler.

### Request flow

1. Mobile application makes an API request.
2. Request reaches the EC2 public endpoint.
3. Nginx receives the request.
4. Nginx forwards it to FastAPI.
5. FastAPI checks authentication and permissions.
6. Business logic queries PostgreSQL.
7. Redis is used for caching where appropriate.
8. Background work is queued.
9. Response returns to the mobile application.

### Media flow

1. User selects a photograph.
2. Backend authorizes an upload.
3. Application uploads the image to S3 using a signed upload URL.
4. Backend stores the media metadata in PostgreSQL.
5. Image is validated and processed.
6. Application displays the image through a controlled delivery URL.

### Notification flow

1. A user sends a like.
2. Backend records the like.
3. Backend checks whether a mutual match exists.
4. A notification task is generated.
5. FCM sends the notification to the recipient's device.

---

# 9. Deployment Security and Reliability

The single-server architecture must still follow production security practices.

## Security

- HTTPS.
- TLS certificates.
- Restricted security groups.
- SSH access restricted to trusted IPs where practical.
- No public PostgreSQL access.
- No public Redis access.
- Secure environment variables and credentials.
- IAM least-privilege policies.
- Private S3 buckets.
- Signed upload and download access.
- Database access controls.
- Request rate limits.
- Authentication token verification.
- Input validation.
- Audit logging.

## Backup strategy

- Automated PostgreSQL backups.
- Backup copies stored in S3.
- Retention policy.
- Periodic restoration testing.
- Database migration backups.
- Recovery procedure documentation.

Never keep the only database backup on the same EC2 instance.

## Monitoring

Monitor:

- CPU usage.
- RAM usage.
- Disk usage.
- Database connections.
- Slow queries.
- API response times.
- Error rates.
- Background job failures.
- S3 storage.
- Data transfer.
- AWS monthly spending.

## Availability limitations

A single EC2 instance creates a single point of failure.

If the instance fails, the application, database and Redis may all become unavailable.

This is acceptable only as a controlled pilot trade-off, with backups and recovery plans.

---

# 10. Estimated AWS Deployment Cost

All amounts below are planning estimates, not guaranteed AWS quotations.

Assumptions:

- AWS Mumbai region.
- EC2 t3.medium.
- 4 GB RAM.
- 50 GB EBS storage.
- 50 GB S3 storage.
- One public IPv4 address.
- Small pilot usage.
- Illustrative exchange rate of ₹90 per USD.

| Component | Monthly estimate |
|---|---:|
| EC2 t3.medium | ₹2,940 |
| EBS 50 GB | ₹350–₹500 |
| Public IPv4 | ₹329 |
| S3 storage and requests | ₹120–₹300 |
| CloudWatch | ₹100–₹300 |
| SES email | ₹0–₹100 |
| SQS | ₹0–₹100 |
| Firebase FCM | ₹0 |
| **Estimated total** | **₹3,839–₹4,569** |

Recommended initial infrastructure budget: ₹5,000 per month.

This estimate excludes:

- Applicable GST.
- OTP SMS.
- Payment gateway fees.
- Marketing.
- Human moderation.
- Customer support.
- Legal and compliance expenses.
- Significant additional internet transfer.
- Optional CloudFront usage.
- Additional verification providers.

The AWS Pricing Calculator should be used before deployment to confirm current Mumbai-region charges.

## Estimated future infrastructure budgets

| Growth stage | Approximate monthly budget |
|---|---:|
| Pilot | ₹5,000 |
| 1,000–5,000 users | ₹8,000–₹20,000 |
| 10,000–20,000 users | ₹25,000–₹60,000 |
| 50,000+ users | ₹80,000–₹2,00,000+ |

These are rough planning scenarios. They do not guarantee that a given EC2 configuration will support the corresponding number of users.

Actual capacity must be measured through load testing.

---

# 11. Expected User Capacity and Load Testing

Initial target scenarios:

| Stage | Registered users | Monthly active | Daily active |
|---|---:|---:|---:|
| Pilot | 500 | 300 | 100 |
| Early growth | 2,000 | 1,000 | 300 |
| Growth | 10,000 | 5,000 | 1,000 |
| Expansion | 30,000 | 15,000 | 3,000 |
| Larger platform | 100,000 | 50,000 | 10,000 |

These are product planning targets, not measured server capacity.

## Load testing

Test:

- Login.
- Profile loading.
- Discovery feed.
- Nearby discovery.
- Image upload.
- Image download.
- Likes.
- Match creation.
- Messaging.
- WebSocket connections.
- Notifications.
- Subscription verification.

Suggested test stages:

1. 20 concurrent users.
2. 50 concurrent users.
3. 100 concurrent users.
4. 200 concurrent users.
5. 300 concurrent users as a later stress test.

Monitor CPU, memory, database connections, latency and error rates.

Do not increase user acquisition beyond what the infrastructure and moderation team can safely support.

---

# 12. Future AWS Scaling Strategy

The initial architecture should avoid unnecessary complexity.

When traffic increases, individual services can be moved out of EC2.

### Stage 1: Pilot

- One EC2 instance.
- PostgreSQL/PostGIS on EC2.
- Redis on EC2.
- FastAPI on EC2.
- Celery on EC2.
- S3 for media.
- FCM for notifications.

### Stage 2: Growing application

- EC2 or ECS for backend.
- Amazon RDS PostgreSQL.
- Amazon ElastiCache Redis.
- S3.
- CloudFront.
- SQS.
- CloudWatch.

### Stage 3: Production scale

- ECS Fargate.
- Application Load Balancer.
- Multiple backend tasks.
- RDS with appropriate high-availability configuration.
- ElastiCache.
- SQS.
- CloudFront.
- AWS WAF.
- Auto Scaling.
- Improved disaster recovery.

Do not introduce Kubernetes or multiple microservices unless actual operational requirements justify them.

---

# 13. Proposed API Structure

The backend should use versioned APIs.

Base path:

`/api/v1`

Potential endpoint groups:

### Authentication

- `/auth/register`
- `/auth/login`
- `/auth/verify`
- `/auth/logout`
- `/auth/refresh`

### Profiles

- `/profiles/me`
- `/profiles/{user_id}`
- `/profiles/me/photos`
- `/profiles/me/preferences`
- `/profiles/me/visibility`

### Location

- `/locations/me`
- `/locations/cities`
- `/locations/localities`
- `/discovery/nearby`

### Discovery

- `/discovery/feed`
- `/discovery/filters`
- `/discovery/pass`
- `/discovery/recommendations`

### Likes

- `/likes`
- `/likes/incoming`
- `/likes/outgoing`
- `/likes/quota`

### Matches

- `/matches`
- `/matches/{match_id}`
- `/matches/{match_id}/unmatch`

### Conversations

- `/conversations`
- `/conversations/{conversation_id}/messages`
- `/messages/{message_id}`

### Subscriptions

- `/subscriptions/plans`
- `/subscriptions/me`
- `/payments/checkout`
- `/payments/webhook`

### Safety

- `/reports`
- `/blocks`
- `/verification/start`
- `/verification/status`

### Administration

- `/admin/users`
- `/admin/reports`
- `/admin/moderation`
- `/admin/subscriptions`
- `/admin/analytics`

These are proposed endpoint names, not implemented APIs.

---

# 14. Database Design Considerations

Major entities:

- User.
- UserProfile.
- UserPreference.
- UserLocation.
- UserPhoto.
- UserInterest.
- RelationshipIntent.
- Like.
- Pass.
- Match.
- Conversation.
- Message.
- Subscription.
- Payment.
- Verification.
- Report.
- Block.
- Notification.
- AuditLog.

Important database constraints:

- Unique user identity.
- No duplicate likes for the same action.
- No duplicate matches.
- Blocked users excluded from discovery.
- Subscription entitlement consistency.
- Payment webhook idempotency.
- Daily like quota enforcement.
- Referential integrity.
- Proper indexes on discovery queries.
- Spatial index on location data.

Precise GPS data should be protected and retained only as long as necessary.

---

# 15. Product Validation Before Development

The product should not move directly into a full-scale development phase.

First validate whether people in Chennai actually want this application.

Initial validation investment: under ₹30,000.

Proposed validation budget:

| Activity | Budget |
|---|---:|
| Interview incentives | ₹6,000 |
| Paid marketing experiments | ₹7,000 |
| Prototype/design | ₹3,000 |
| Landing page/domain | ₹2,000 |
| Research recruitment | ₹3,000 |
| Creative content | ₹2,000 |
| Tools and research contingency | ₹2,000 |
| Additional contingency | ₹5,000 |
| **Total** | **₹30,000** |

## 30-day validation programme

### Week 1: Market research

- Study competitors.
- Interview 30 potential users.
- Include existing dating-app users.
- Include former dating-app users.
- Include people who have never used dating apps.
- Understand trust and privacy concerns.
- Understand relationship preferences.
- Understand willingness to pay.

Aim for a diverse interview sample, including a meaningful number of women participants.

### Week 2: Landing page and pricing validation

Create landing page experiments with:

- ₹20 daily plan.
- ₹99 weekly plan.
- ₹299 monthly plan.

Do not charge users during this experiment.

Measure:

- Landing page visits.
- Registration interest.
- Pricing page views.
- Plan selections.
- Strong purchase intent.
- Objections to pricing.

A pricing selection is not the same as an actual purchase.

### Week 3: Prototype validation

Build a clickable Figma prototype.

Test:

- Registration.
- Profile setup.
- Swipe discovery.
- City selection.
- Nearby Premium discovery.
- Like limits.
- Matching.
- Messaging.
- Subscription upgrade.

### Week 4: Pilot preparation

- Analyze interview feedback.
- Analyze landing page results.
- Evaluate acquisition cost.
- Evaluate user trust.
- Evaluate profile density.
- Evaluate moderation requirements.
- Prepare a go/no-go report.

No full application coding should begin until the validation decision is made.

---

# 16. Pilot Success Criteria

Initial internal targets:

| Metric | Proposed target |
|---|---:|
| Waitlist registrations | 300 |
| Completed/verified profiles | 150 |
| Survey responses | 100–150 |
| User interviews | 30 |
| Strong Premium interest | 15% |
| Week-two retention | 25% |
| Users finding relevant profiles | 60% |

These are proposed internal decision thresholds, not established dating-industry benchmarks.

## Go decision

Proceed to MVP development if:

- There is sufficient genuine user interest.
- Users understand the value proposition.
- There is reasonable demand for Premium.
- The profile pool is sufficiently dense.
- Safety operations are manageable.
- Acquisition costs appear economically plausible.

## Iterate decision

Improve the product before development if:

- Users like the idea but dislike the pricing.
- Profile completion is weak.
- Users do not understand nearby discovery.
- Trust concerns are unresolved.
- Discovery preferences are unclear.

## No-go decision

Pause or reconsider the concept if:

- Qualified user acquisition is very weak.
- Very few users complete profiles.
- Users show little genuine interest.
- Local profile density is inadequate.
- Safety requirements cannot be responsibly managed.

Do not use fake profiles to create artificial activity.

---

# 17. Analytics and Business Metrics

The platform should measure more than downloads.

Important metrics:

### Acquisition

- Landing page conversion.
- Registration conversion.
- Cost per qualified registration.
- Referral conversion.
- City-wise registrations.

### Activation

- Profile completion.
- Photograph upload completion.
- First discovery session.
- First like.
- First match.

### Engagement

- Daily active users.
- Weekly active users.
- Profiles viewed.
- Likes sent.
- Matches created.
- Messages sent.
- Conversations started.

### Retention

- Day-one retention.
- Day-seven retention.
- Day-thirty retention.
- Returning users.
- Churn.

### Monetization

- Premium conversion.
- Revenue per paying user.
- Subscription renewal.
- Subscription cancellation.
- Refund rate.
- Revenue by plan.

### Safety

- Reports per active user.
- Block rate.
- Verification success.
- Moderation response time.
- Repeat offender rate.

Measure discovery liquidity separately by age, gender/orientation preferences, relationship intention, location and activity. Total registrations alone do not indicate that every user has enough compatible profiles to discover.

---

# 18. Privacy, Legal and Compliance

The platform will handle sensitive personal information and location-related information.

The following areas must be addressed before launch:

- India's Digital Personal Data Protection framework.
- Applicable DPDP Rules and commencement provisions.
- Privacy policy.
- Terms of service.
- User consent.
- Data retention.
- Account deletion.
- Data access and correction processes.
- Security incident response.
- User grievance process.
- Age assurance.
- Location consent.
- Payment compliance.
- App Store and Google Play policies.

Additional considerations:

1. Do not expose precise location.
2. Do not sell personal dating data.
3. Restrict internal access to private conversations.
4. Maintain an auditable moderation process.
5. Explain how verification data is handled.
6. Provide clear account deletion options.
7. Obtain legal review before launch.

This document is a product and technical plan, not legal advice. Obtain appropriate Indian legal and privacy compliance advice.

---

# 19. Development Roadmap

## Phase 0: Validation

Duration: 30 days.

Deliverables:

- Competitor analysis.
- User interviews.
- Survey analysis.
- Landing page.
- Pricing experiment.
- Figma prototype.
- Go/no-go report.

## Phase 1: Product foundation

Deliverables:

- Project structure.
- Authentication.
- Database.
- User onboarding.
- Profile management.
- Image upload.
- Location preferences.
- Basic admin access.

## Phase 2: Core dating experience

Deliverables:

- Discovery feed.
- Swipe actions.
- Daily likes.
- Mutual matching.
- Match notifications.
- Basic messaging.
- Blocking and reporting.

## Phase 3: Monetization

Deliverables:

- Subscription plans.
- Payment integration.
- Premium entitlements.
- Nearby discovery.
- Radius filters.
- Incoming likes.
- Advanced filters.

## Phase 4: Safety and production readiness

Deliverables:

- Verification.
- Moderation.
- Admin dashboard.
- Security review.
- Backup and recovery.
- Monitoring.
- Load testing.
- Privacy and legal review.

## Phase 5: Chennai pilot

Deliverables:

- Controlled public launch.
- Local marketing.
- User support.
- Safety operations.
- Analytics.
- Retention analysis.
- Product improvements.

## Phase 6: Expansion

Deliverables:

- Additional Indian cities.
- Improved recommendations.
- Infrastructure scaling.
- Internationalization.
- Additional premium features.

---

# 20. Final Technology and Cost Summary

## Final selected stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo |
| Language | TypeScript |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Geographic queries | PostGIS |
| Cache | Redis |
| Background jobs | Celery |
| Web server | Nginx |
| Containers | Docker Compose |
| Initial hosting | AWS EC2 |
| File storage | Amazon S3 |
| Push notifications | Firebase Cloud Messaging |
| Email | Amazon SES |
| Authentication | Amazon Cognito |
| Optional queue | Amazon SQS |
| Monitoring | Amazon CloudWatch |
| CI/CD | GitHub Actions |
| Website/admin | Next.js |

## Initial monthly infrastructure budget

| Expense | Budget |
|---|---:|
| AWS infrastructure | ₹5,000 |
| OTP/SMS allowance | ₹1,000–₹2,000 |
| Moderation/support allowance | ₹3,000 |
| Marketing allowance | ₹5,000 |
| Miscellaneous | ₹2,000 |
| **Total planning budget** | **₹16,000–₹17,000/month** |

This is a lean operating budget, not a guarantee. Actual moderation, SMS, marketing, taxes and infrastructure expenses may be higher.

## Final architectural decision

The initial application will use:

**React Native + FastAPI + PostgreSQL/PostGIS + Redis + Docker Compose, hosted on one AWS EC2 instance, with Amazon S3 for media and Firebase Cloud Messaging for push notifications.**

We will not start with:

- Kubernetes.
- Microservices.
- Separate database servers.
- Separate Redis servers.
- Elasticsearch.
- A vector database.
- Video calling.
- Expensive AI infrastructure.

These can be introduced when actual product requirements and usage justify them.

---

# 21. Final Strategic Recommendation

The most important objective is not to build the largest dating application immediately.

The first objective is to establish whether a concentrated Chennai audience wants this product, whether users can find relevant profiles, whether they trust the platform and whether some users are willing to pay for Premium.

The order of execution should be:

1. Validate the market.
2. Validate the product concept.
3. Validate discovery and location features.
4. Validate the pricing.
5. Finalize the MVP.
6. Build the application.
7. Launch a controlled Chennai pilot.
8. Measure retention, liquidity and safety.
9. Improve the product.
10. Expand to additional cities.

**The guiding principle: Build a reliable, safe and useful dating platform first. Scale the infrastructure and features only when real user demand requires it.**
