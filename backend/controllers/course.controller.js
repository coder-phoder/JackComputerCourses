const axios = require('axios');
const mongoose = require('mongoose');
const Course = require('../models/course.model');
const Chapter = require('../models/chapter.model');
const User = require('../models/user.model');

const YOUTUBE_PLAYLIST_ITEMS_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const YOUTUBE_PAGE_SIZE = 50;
const LOCAL_CLIENT_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
];
const DAYS_PER_COURSE_MONTH = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const hasField = (body, field) => Object.prototype.hasOwnProperty.call(body || {}, field);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const escapeHtmlAttribute = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const getClientOrigin = (value) => {
    try {
        return new URL(value).origin;
    } catch (error) {
        return '';
    }
};

const getFrameAncestors = () => {
    const configuredClientOrigin = getClientOrigin(process.env.CLIENT_URL || '');

    return [...new Set([
        configuredClientOrigin,
        ...LOCAL_CLIENT_ORIGINS
    ].filter(Boolean))].join(' ');
};

const slugify = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeStringArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const normalizePhone = (value) => String(value || '').trim();

const normalizePhoneArray = (value) => {
    const source = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(',')
            : value === undefined || value === null
                ? []
                : [value];

    return [...new Set(source
        .map(normalizePhone)
        .filter(Boolean))];
};

const normalizeBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true';
    }

    return Boolean(value);
};

const parseNonNegativeNumber = (value) => {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
        return null;
    }

    return numberValue;
};

const parsePositiveNumber = (value) => {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
        return null;
    }

    return numberValue;
};

const parseNonNegativeInteger = (value) => {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
        return null;
    }

    return numberValue;
};

const parsePlaylistId = (playlistUrl) => {
    const value = String(playlistUrl || '').trim();

    if (!value) {
        return null;
    }

    const listMatch = value.match(/[?&]list=([^&#]+)/);

    if (listMatch?.[1]) {
        return decodeURIComponent(listMatch[1]).trim() || null;
    }

    const looksLikeRawPlaylistId = /^[a-zA-Z0-9_-]{10,}$/.test(value)
        && !/[/:?&=#]/.test(value);

    if (looksLikeRawPlaylistId) {
        return value;
    }

    try {
        const parsedUrl = new URL(value.includes('://') ? value : `https://${value}`);
        const playlistId = parsedUrl.searchParams.get('list');

        if (playlistId) {
            return playlistId.trim();
        }
    } catch (error) {
        return null;
    }

    return null;
};

const getBestThumbnailUrl = (thumbnails = {}) => {
    const thumbnail = thumbnails.maxres
        || thumbnails.standard
        || thumbnails.high
        || thumbnails.medium
        || thumbnails.default;

    return thumbnail?.url || '';
};

const getYoutubeApiErrorMessage = (error) => (
    error.response?.data?.error?.message
    || error.message
    || 'Unable to fetch YouTube playlist videos'
);

const createYoutubeError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const fetchPlaylistItems = async (playlistId, apiKey) => {
    const playlistItems = [];
    let pageToken = '';

    do {
        const response = await axios.get(YOUTUBE_PLAYLIST_ITEMS_URL, {
            params: {
                part: 'snippet',
                playlistId,
                maxResults: YOUTUBE_PAGE_SIZE,
                pageToken,
                key: apiKey
            }
        });

        playlistItems.push(...(response.data?.items || []));
        pageToken = response.data?.nextPageToken || '';
    } while (pageToken);

    return playlistItems;
};

const fetchVideoDetails = async (videoIds, apiKey) => {
    const videoDetails = new Map();

    for (let index = 0; index < videoIds.length; index += YOUTUBE_PAGE_SIZE) {
        const batchVideoIds = videoIds.slice(index, index + YOUTUBE_PAGE_SIZE);

        if (!batchVideoIds.length) {
            continue;
        }

        const response = await axios.get(YOUTUBE_VIDEOS_URL, {
            params: {
                part: 'snippet,contentDetails,status',
                id: batchVideoIds.join(','),
                key: apiKey
            }
        });

        (response.data?.items || []).forEach((video) => {
            if (video.id) {
                videoDetails.set(video.id, video);
            }
        });
    }

    return videoDetails;
};

const buildVideoSnapshots = async (playlistId) => {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        throw createYoutubeError(500, 'YouTube API key is not configured');
    }

    try {
        const playlistItems = await fetchPlaylistItems(playlistId, apiKey);
        const playlistVideos = playlistItems
            .map((item) => {
                const snippet = item.snippet || {};
                const youtubeVideoId = snippet.resourceId?.videoId;

                if (!youtubeVideoId) {
                    return null;
                }

                return {
                    youtubeVideoId,
                    playlistTitle: snippet.title || 'Untitled video',
                    playlistThumbnailUrl: getBestThumbnailUrl(snippet.thumbnails),
                    playlistPublishedAt: snippet.publishedAt || null,
                    position: Number.isInteger(snippet.position) ? snippet.position : 0
                };
            })
            .filter(Boolean);

        const videoIds = [...new Set(playlistVideos.map((video) => video.youtubeVideoId))];
        const videoDetails = await fetchVideoDetails(videoIds, apiKey);
        const fetchedAt = new Date();

        return playlistVideos.map((playlistVideo) => {
            const details = videoDetails.get(playlistVideo.youtubeVideoId);
            const snippet = details?.snippet || {};
            const contentDetails = details?.contentDetails || {};

            return {
                youtubeVideoId: playlistVideo.youtubeVideoId,
                title: snippet.title || playlistVideo.playlistTitle,
                thumbnailUrl: getBestThumbnailUrl(snippet.thumbnails) || playlistVideo.playlistThumbnailUrl,
                position: playlistVideo.position,
                duration: contentDetails.duration || '',
                publishedAt: snippet.publishedAt || playlistVideo.playlistPublishedAt || null,
                watchUrl: `https://www.youtube.com/watch?v=${playlistVideo.youtubeVideoId}`,
                embedUrl: `https://www.youtube.com/embed/${playlistVideo.youtubeVideoId}`,
                fetchedAt
            };
        });
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createYoutubeError(502, getYoutubeApiErrorMessage(error));
    }
};

const parseCourseDurationMonths = (value) => {
    const rawValue = String(value ?? '').trim();

    if (!rawValue) {
        return null;
    }

    return parsePositiveNumber(rawValue);
};

const formatDurationMonths = (value) => {
    const durationMonths = parseCourseDurationMonths(value);

    return durationMonths === null ? '' : String(durationMonths);
};

const getCourseDurationMonths = (course) => parseCourseDurationMonths(course?.duration);

const getCourseDurationDays = (durationMonths) => {
    const parsedDurationMonths = parseCourseDurationMonths(durationMonths);

    return parsedDurationMonths === null
        ? null
        : Math.ceil(parsedDurationMonths * DAYS_PER_COURSE_MONTH);
};

const getCourseDurationValidationMessage = (duration, isOpenToAll) => {
    if (isOpenToAll) {
        return '';
    }

    return parseCourseDurationMonths(duration) === null
        ? 'Duration must be a positive number of months'
        : '';
};

const parseDateValue = (value) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};

const getUtcStartOfDay = (value) => {
    const date = parseDateValue(value);

    if (!date) {
        return null;
    }

    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
    ));
};

const addDays = (date, days) => new Date(date.getTime() + (days * MILLISECONDS_PER_DAY));

const formatDateOnly = (value) => {
    const date = parseDateValue(value);

    return date ? date.toISOString().slice(0, 10) : '';
};

const getFallbackGrantedAt = (course) => (
    parseDateValue(course?.createdAt)
    || parseDateValue(course?.updatedAt)
    || new Date()
);

const getCourseAccessGrants = (course) => {
    const grantMap = new Map();
    const fallbackGrantedAt = getFallbackGrantedAt(course);

    (course?.accessGrants || []).forEach((grant) => {
        const phone = normalizePhone(grant?.phone);

        if (!phone || grantMap.has(phone)) {
            return;
        }

        grantMap.set(phone, {
            phone,
            grantedAt: parseDateValue(grant?.grantedAt) || fallbackGrantedAt
        });
    });

    (course?.allowedUserPhones || []).forEach((phoneValue) => {
        const phone = normalizePhone(phoneValue);

        if (!phone || grantMap.has(phone)) {
            return;
        }

        grantMap.set(phone, {
            phone,
            grantedAt: fallbackGrantedAt
        });
    });

    return [...grantMap.values()];
};

const buildCourseAccessGrants = (course, phones, options = {}) => {
    const normalizedPhones = normalizePhoneArray(phones);
    const grantedAt = parseDateValue(options.grantedAt) || new Date();
    const resetPhones = new Set(normalizePhoneArray(options.resetPhones));
    const existingGrantMap = new Map(getCourseAccessGrants(course)
        .map((grant) => [grant.phone, grant]));

    return normalizedPhones.map((phone) => {
        const existingGrant = existingGrantMap.get(phone);
        const shouldResetGrantDate = options.resetAll
            || resetPhones.has(phone)
            || !existingGrant;

        return {
            phone,
            grantedAt: shouldResetGrantDate ? grantedAt : existingGrant.grantedAt
        };
    });
};

const setCourseAccessPhones = (course, phones, options = {}) => {
    const allowedUserPhones = normalizePhoneArray(phones);

    course.allowedUserPhones = allowedUserPhones;
    course.accessGrants = buildCourseAccessGrants(course, allowedUserPhones, options);
};

const addCourseAccessPhones = (course, phones) => {
    const phonesToGrant = normalizePhoneArray(phones);
    const currentPhones = getCourseAccessGrants(course).map((grant) => grant.phone);

    setCourseAccessPhones(
        course,
        [...currentPhones, ...phonesToGrant],
        {
            grantedAt: new Date(),
            resetPhones: phonesToGrant
        }
    );
};

const removeCourseAccessPhones = (course, phones) => {
    const phonesToRemove = new Set(normalizePhoneArray(phones));
    const nextPhones = getCourseAccessGrants(course)
        .map((grant) => grant.phone)
        .filter((phone) => !phonesToRemove.has(phone));

    setCourseAccessPhones(course, nextPhones);
};

const getCourseAccessGrant = (course, userPhone) => {
    const normalizedUserPhone = normalizePhone(userPhone);

    if (!normalizedUserPhone) {
        return null;
    }

    return getCourseAccessGrants(course)
        .find((grant) => grant.phone === normalizedUserPhone) || null;
};

const getCourseAccessWindow = (course, userPhone, now = new Date()) => {
    const normalizedUserPhone = normalizePhone(userPhone);

    if (!normalizedUserPhone) {
        return null;
    }

    if (course?.isOpenToAll) {
        return {
            type: 'open',
            startsAt: null,
            startsOn: '',
            endsAt: null,
            endsOn: '',
            durationMonths: null,
            durationDays: null,
            isExpired: false
        };
    }

    const accessGrant = getCourseAccessGrant(course, normalizedUserPhone);

    if (!accessGrant) {
        return null;
    }

    const durationMonths = getCourseDurationMonths(course);
    const durationDays = getCourseDurationDays(durationMonths);
    const startsAt = getUtcStartOfDay(accessGrant.grantedAt);

    if (!durationDays || !startsAt) {
        return null;
    }

    const endsAt = addDays(startsAt, durationDays);
    const currentTime = parseDateValue(now) || new Date();

    return {
        type: 'assigned',
        startsAt,
        startsOn: formatDateOnly(startsAt),
        endsAt,
        endsOn: formatDateOnly(endsAt),
        durationMonths,
        durationDays,
        isExpired: currentTime.getTime() >= endsAt.getTime()
    };
};

const formatAccessWindowData = (accessWindow) => ({
    accessType: accessWindow?.type || '',
    accessStartsAt: accessWindow?.startsAt || null,
    accessStartsOn: accessWindow?.startsOn || '',
    accessEndsAt: accessWindow?.endsAt || null,
    accessEndsOn: accessWindow?.endsOn || '',
    accessDurationMonths: accessWindow?.durationMonths || null,
    accessDurationDays: accessWindow?.durationDays || null,
    isAccessExpired: Boolean(accessWindow?.isExpired)
});

const formatCourseAccessGrant = (course, grant, now = new Date()) => ({
    phone: grant.phone,
    grantedAt: grant.grantedAt,
    grantedOn: formatDateOnly(grant.grantedAt),
    ...formatAccessWindowData(getCourseAccessWindow(course, grant.phone, now))
});

const formatCourseAccessResponse = (course) => {
    const accessGrants = getCourseAccessGrants(course);

    return {
        allowedUserPhones: accessGrants.map((grant) => grant.phone),
        accessGrants: accessGrants.map((grant) => formatCourseAccessGrant(course, grant)),
        course: formatCourseData(course, {}, { includeAccessList: true })
    };
};

const formatCourseData = (course, counts = {}, options = {}) => {
    const accessGrants = getCourseAccessGrants(course);
    const durationMonths = getCourseDurationMonths(course);
    const durationDays = getCourseDurationDays(durationMonths);
    const courseData = {
        _id: course._id.toString(),
        title: course.title,
        slug: course.slug,
        duration: course.duration || '',
        durationMonths,
        durationDays,
        price: course.price,
        description: course.description,
        shortDescription: course.shortDescription,
        thumbnailUrl: course.thumbnailUrl,
        category: course.category,
        level: course.level,
        language: course.language,
        tags: course.tags || [],
        highlights: course.highlights || [],
        prerequisites: course.prerequisites || [],
        isPublished: course.isPublished,
        isOpenToAll: Boolean(course.isOpenToAll),
        showIde: Boolean(course.showIde),
        chapterCount: counts.chapterCount || 0,
        videoCount: counts.videoCount || 0,
        accessUserCount: accessGrants.length,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
    };

    if (options.includeAccessList) {
        courseData.allowedUserPhones = accessGrants.map((grant) => grant.phone);
        courseData.accessGrants = accessGrants.map((grant) => (
            formatCourseAccessGrant(course, grant, options.now)
        ));
    }

    if (options.includeUserAccess) {
        Object.assign(
            courseData,
            formatAccessWindowData(getCourseAccessWindow(course, options.userPhone, options.now))
        );
    }

    return courseData;
};

const formatChapterData = (chapter) => ({
    _id: chapter._id.toString(),
    courseId: chapter.courseId.toString(),
    name: chapter.name,
    playlistUrl: chapter.playlistUrl,
    playlistId: chapter.playlistId,
    order: chapter.order,
    videoCount: chapter.videoCount,
    lastSyncedAt: chapter.lastSyncedAt,
    syncStatus: chapter.syncStatus,
    syncError: chapter.syncError,
    videos: chapter.videos || [],
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt
});

const getUserVideoKey = (chapter, video) => `${chapter._id.toString()}:${video.position}`;

const formatUserVideoData = (chapter, video) => ({
    id: getUserVideoKey(chapter, video),
    title: video.title,
    position: video.position,
    duration: video.duration,
    playerPath: `/user/courses/${chapter.courseId.toString()}/chapters/${chapter._id.toString()}/videos/${video.position}/embed`
});

const formatUserChapterData = (chapter) => ({
    _id: chapter._id.toString(),
    name: chapter.name,
    order: chapter.order,
    videoCount: chapter.videoCount,
    videos: (chapter.videos || []).map((video) => formatUserVideoData(chapter, video))
});

const formatFacultyVideoData = (chapter, video) => ({
    id: getUserVideoKey(chapter, video),
    title: video.title,
    position: video.position,
    duration: video.duration,
    thumbnailUrl: video.thumbnailUrl,
    watchUrl: video.watchUrl,
    playerPath: `/faculty/courses/${chapter.courseId.toString()}/chapters/${chapter._id.toString()}/videos/${video.position}/embed`
});

const formatFacultyChapterData = (chapter) => ({
    _id: chapter._id.toString(),
    name: chapter.name,
    order: chapter.order,
    videoCount: chapter.videoCount,
    videos: (chapter.videos || []).map((video) => formatFacultyVideoData(chapter, video))
});

const buildUserVideoEmbedUrl = (youtubeVideoId) => {
    const params = new URLSearchParams({
        controls: '1',
        rel: '0',
        modestbranding: '1',
        iv_load_policy: '3',
        playsinline: '1',
        disablekb: '0',
        fs: '1'
    });

    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeVideoId)}?${params.toString()}`;
};

const buildUserVideoEmbedHtml = (embedUrl, title) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtmlAttribute(title || 'Course video')}</title>
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #020617;
      }

      iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${escapeHtmlAttribute(embedUrl)}"
      title="${escapeHtmlAttribute(title || 'Course video')}"
      loading="eager"
      allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allowfullscreen
    ></iframe>
  </body>
</html>`;

const getCourseCounts = async (courseIds) => {
    if (!courseIds.length) {
        return new Map();
    }

    const counts = await Chapter.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        {
            $group: {
                _id: '$courseId',
                chapterCount: { $sum: 1 },
                videoCount: { $sum: '$videoCount' }
            }
        }
    ]);

    return new Map(counts.map((item) => [
        item._id.toString(),
        {
            chapterCount: item.chapterCount,
            videoCount: item.videoCount
        }
    ]));
};

const buildCoursePayload = (body, options = {}) => {
    const payload = {};
    const errors = [];
    const isCreate = options.isCreate;

    if (isCreate || hasField(body, 'title')) {
        const title = String(body.title || '').trim();

        if (!title) {
            errors.push('Title is required');
        } else {
            payload.title = title;
        }
    }

    if (isCreate || hasField(body, 'duration')) {
        const duration = String(body.duration ?? '').trim();

        if (!duration) {
            payload.duration = '';
        } else if (parseCourseDurationMonths(duration) === null) {
            errors.push('Duration must be a positive number of months');
        } else {
            payload.duration = formatDurationMonths(duration);
        }
    }

    if (isCreate || hasField(body, 'price')) {
        const price = parseNonNegativeNumber(body.price);

        if (price === null) {
            errors.push('Price must be a non-negative number');
        } else {
            payload.price = price;
        }
    }

    if (isCreate || hasField(body, 'description')) {
        const description = String(body.description || '').trim();

        if (!description) {
            errors.push('Description is required');
        } else {
            payload.description = description;
        }
    }

    if (hasField(body, 'slug')) {
        const slug = slugify(body.slug);

        if (!slug) {
            errors.push('Slug is required');
        } else {
            payload.slug = slug;
        }
    } else if (isCreate && payload.title) {
        payload.slug = slugify(payload.title);
    }

    ['shortDescription', 'thumbnailUrl', 'category', 'level', 'language'].forEach((field) => {
        if (hasField(body, field)) {
            payload[field] = String(body[field] || '').trim();
        }
    });

    ['tags', 'highlights', 'prerequisites'].forEach((field) => {
        if (hasField(body, field)) {
            payload[field] = normalizeStringArray(body[field]);
        }
    });

    if (hasField(body, 'allowedUserPhones')) {
        payload.allowedUserPhones = normalizePhoneArray(body.allowedUserPhones);
    }

    if (hasField(body, 'isPublished')) {
        payload.isPublished = normalizeBoolean(body.isPublished);
    }

    if (hasField(body, 'isOpenToAll')) {
        payload.isOpenToAll = normalizeBoolean(body.isOpenToAll);
    }

    if (hasField(body, 'showIde')) {
        payload.showIde = normalizeBoolean(body.showIde);
    }

    if (isCreate && !payload.slug) {
        errors.push('Slug is required');
    }

    return { payload, errors };
};

const ensureCourseSlugAvailable = async (slug, courseId = null) => {
    const query = { slug };

    if (courseId) {
        query._id = { $ne: courseId };
    }

    const existingCourse = await Course.findOne(query).select('_id');
    return !existingCourse;
};

const getMissingUserPhones = async (phones) => {
    const normalizedPhones = normalizePhoneArray(phones);

    if (!normalizedPhones.length) {
        return [];
    }

    const users = await User.find({ phone: { $in: normalizedPhones } }).select('phone');
    const existingPhones = new Set(users.map((user) => user.phone));

    return normalizedPhones.filter((phone) => !existingPhones.has(phone));
};

const sendMissingUserPhonesError = (res, missingPhones) => sendError(
    res,
    404,
    missingPhones.length === 1
        ? `User with phone ${missingPhones[0]} was not found`
        : `Users with these phones were not found: ${missingPhones.join(', ')}`
);

const getAccessPhonesFieldValue = (body = {}) => {
    if (hasField(body, 'phones')) {
        return body.phones;
    }

    if (hasField(body, 'allowedUserPhones')) {
        return body.allowedUserPhones;
    }

    if (hasField(body, 'phone')) {
        return body.phone;
    }

    return undefined;
};

const getUserCourseLookupQuery = (courseIdOrSlug) => {
    const value = String(courseIdOrSlug || '').trim();

    if (isValidObjectId(value)) {
        return { _id: value };
    }

    const slug = slugify(value);
    return slug ? { slug } : null;
};

const courseUserHasAccess = (course, userPhone, options = {}) => {
    const normalizedUserPhone = normalizePhone(userPhone);

    if (!normalizedUserPhone) {
        return false;
    }

    if (course?.isOpenToAll) {
        return true;
    }

    const accessWindow = getCourseAccessWindow(course, normalizedUserPhone, options.now);

    return Boolean(accessWindow && !accessWindow.isExpired);
};

const getNextChapterOrder = async (courseId) => {
    const lastChapter = await Chapter.findOne({ courseId }).sort({ order: -1 }).select('order');
    return lastChapter ? lastChapter.order + 1 : 0;
};

const applySyncedVideosToChapter = (chapter, videos) => {
    chapter.videos = videos;
    chapter.videoCount = videos.length;
    chapter.lastSyncedAt = new Date();
    chapter.syncStatus = 'synced';
    chapter.syncError = '';
};

const getAllCoursesByAdmin = async (req, res) => {
    try {
        const courses = await Course.find({}).sort({ createdAt: -1 });
        const courseCounts = await getCourseCounts(courses.map((course) => course._id));

        return res.status(200).json({
            success: true,
            message: 'Courses fetched successfully',
            data: {
                courses: courses.map((course) => formatCourseData(
                    course,
                    courseCounts.get(course._id.toString()) || {},
                    { includeAccessList: true }
                ))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching courses');
    }
};

const createCourseByAdmin = async (req, res) => {
    try {
        const { payload, errors } = buildCoursePayload(req.body || {}, { isCreate: true });

        if (errors.length) {
            return sendError(res, 400, errors[0]);
        }

        const durationError = getCourseDurationValidationMessage(
            payload.duration,
            Boolean(payload.isOpenToAll)
        );

        if (durationError) {
            return sendError(res, 400, durationError);
        }

        const slugAvailable = await ensureCourseSlugAvailable(payload.slug);

        if (!slugAvailable) {
            return sendError(res, 409, 'Course with this slug already exists');
        }

        if (hasField(payload, 'allowedUserPhones')) {
            const missingPhones = await getMissingUserPhones(payload.allowedUserPhones);

            if (missingPhones.length) {
                return sendMissingUserPhonesError(res, missingPhones);
            }

            payload.accessGrants = buildCourseAccessGrants(
                {},
                payload.allowedUserPhones,
                { resetAll: true }
            );
        }

        const course = await Course.create(payload);

        return res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: { course: formatCourseData(course, {}, { includeAccessList: true }) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Course with this slug already exists');
        }

        return sendError(res, 500, 'Something went wrong while creating course');
    }
};

const getCourseByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapters = await Chapter.find({ courseId }).sort({ order: 1, createdAt: 1 });
        const counts = {
            chapterCount: chapters.length,
            videoCount: chapters.reduce((total, chapter) => total + chapter.videoCount, 0)
        };

        return res.status(200).json({
            success: true,
            message: 'Course fetched successfully',
            data: {
                course: formatCourseData(course, counts, { includeAccessList: true }),
                chapters: chapters.map(formatChapterData)
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course');
    }
};

const updateCourseByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const { payload, errors } = buildCoursePayload(req.body || {}, { isCreate: false });

        if (errors.length) {
            return sendError(res, 400, errors[0]);
        }

        if (!Object.keys(payload).length) {
            return sendError(res, 400, 'At least one course field is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        if (payload.slug) {
            const slugAvailable = await ensureCourseSlugAvailable(payload.slug, courseId);

            if (!slugAvailable) {
                return sendError(res, 409, 'Course with this slug already exists');
            }
        }

        if (hasField(payload, 'allowedUserPhones')) {
            const missingPhones = await getMissingUserPhones(payload.allowedUserPhones);

            if (missingPhones.length) {
                return sendMissingUserPhonesError(res, missingPhones);
            }
        }

        const nextIsOpenToAll = hasField(payload, 'isOpenToAll')
            ? payload.isOpenToAll
            : Boolean(course.isOpenToAll);
        const nextDuration = hasField(payload, 'duration') ? payload.duration : course.duration;
        const durationError = getCourseDurationValidationMessage(nextDuration, nextIsOpenToAll);

        if (durationError) {
            return sendError(res, 400, durationError);
        }

        if (hasField(payload, 'allowedUserPhones')) {
            setCourseAccessPhones(course, payload.allowedUserPhones);
            delete payload.allowedUserPhones;
        }

        Object.assign(course, payload);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: { course: formatCourseData(course, {}, { includeAccessList: true }) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Course with this slug already exists');
        }

        return sendError(res, 500, 'Something went wrong while updating course');
    }
};

const getCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Course access fetched successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course access');
    }
};

const replaceCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const accessPhonesValue = getAccessPhonesFieldValue(req.body || {});

        if (accessPhonesValue === undefined) {
            return sendError(res, 400, 'Phone list is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const allowedUserPhones = normalizePhoneArray(accessPhonesValue);
        const missingPhones = await getMissingUserPhones(allowedUserPhones);

        if (missingPhones.length) {
            return sendMissingUserPhonesError(res, missingPhones);
        }

        setCourseAccessPhones(course, allowedUserPhones);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course access updated successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while updating course access');
    }
};

const addCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const phones = normalizePhoneArray(getAccessPhonesFieldValue(req.body || {}));

        if (!phones.length) {
            return sendError(res, 400, 'At least one phone is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const missingPhones = await getMissingUserPhones(phones);

        if (missingPhones.length) {
            return sendMissingUserPhonesError(res, missingPhones);
        }

        addCourseAccessPhones(course, phones);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course access added successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while adding course access');
    }
};

const removeCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const phones = normalizePhoneArray(getAccessPhonesFieldValue(req.body || {}));

        if (!phones.length) {
            return sendError(res, 400, 'At least one phone is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        removeCourseAccessPhones(course, phones);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course access removed successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while removing course access');
    }
};

const deleteCourseByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findByIdAndDelete(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        await Chapter.deleteMany({ courseId });

        return res.status(200).json({
            success: true,
            message: 'Course deleted successfully',
            data: {}
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while deleting course');
    }
};

const getChaptersByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId).select('_id');

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapters = await Chapter.find({ courseId }).sort({ order: 1, createdAt: 1 });

        return res.status(200).json({
            success: true,
            message: 'Chapters fetched successfully',
            data: { chapters: chapters.map(formatChapterData) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching chapters');
    }
};

const createChapterByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { name, playlistUrl } = req.body || {};

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId).select('_id');

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapterName = String(name || '').trim();

        if (!chapterName) {
            return sendError(res, 400, 'Chapter name is required');
        }

        const trimmedPlaylistUrl = String(playlistUrl || '').trim();
        const playlistId = parsePlaylistId(trimmedPlaylistUrl);

        if (!playlistId) {
            return sendError(res, 400, 'Valid YouTube playlist link is required');
        }

        const order = hasField(req.body, 'order')
            ? parseNonNegativeInteger(req.body.order)
            : await getNextChapterOrder(courseId);

        if (order === null) {
            return sendError(res, 400, 'Chapter order must be a non-negative integer');
        }

        const videos = await buildVideoSnapshots(playlistId);
        const syncedAt = new Date();
        const chapter = await Chapter.create({
            courseId,
            name: chapterName,
            playlistUrl: trimmedPlaylistUrl,
            playlistId,
            order,
            videos,
            videoCount: videos.length,
            lastSyncedAt: syncedAt,
            syncStatus: 'synced',
            syncError: ''
        });

        return res.status(201).json({
            success: true,
            message: 'Chapter created successfully',
            data: { chapter: formatChapterData(chapter) }
        });
    } catch (error) {
        return sendError(
            res,
            error.statusCode || 500,
            error.statusCode ? error.message : 'Something went wrong while creating chapter'
        );
    }
};

const updateChapterByAdmin = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const chapter = await Chapter.findOne({ _id: chapterId, courseId });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        const allowedFields = ['name', 'playlistUrl', 'order'];
        const hasUpdate = allowedFields.some((field) => hasField(req.body, field));

        if (!hasUpdate) {
            return sendError(res, 400, 'At least one chapter field is required');
        }

        if (hasField(req.body, 'name')) {
            const chapterName = String(req.body.name || '').trim();

            if (!chapterName) {
                return sendError(res, 400, 'Chapter name is required');
            }

            chapter.name = chapterName;
        }

        if (hasField(req.body, 'order')) {
            const order = parseNonNegativeInteger(req.body.order);

            if (order === null) {
                return sendError(res, 400, 'Chapter order must be a non-negative integer');
            }

            chapter.order = order;
        }

        if (hasField(req.body, 'playlistUrl')) {
            const trimmedPlaylistUrl = String(req.body.playlistUrl || '').trim();
            const playlistId = parsePlaylistId(trimmedPlaylistUrl);

            if (!playlistId) {
                return sendError(res, 400, 'Valid YouTube playlist link is required');
            }

            if (playlistId !== chapter.playlistId || trimmedPlaylistUrl !== chapter.playlistUrl) {
                const videos = await buildVideoSnapshots(playlistId);
                chapter.playlistUrl = trimmedPlaylistUrl;
                chapter.playlistId = playlistId;
                applySyncedVideosToChapter(chapter, videos);
            }
        }

        await chapter.save();

        return res.status(200).json({
            success: true,
            message: 'Chapter updated successfully',
            data: { chapter: formatChapterData(chapter) }
        });
    } catch (error) {
        return sendError(
            res,
            error.statusCode || 500,
            error.statusCode ? error.message : 'Something went wrong while updating chapter'
        );
    }
};

const deleteChapterByAdmin = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const chapter = await Chapter.findOneAndDelete({ _id: chapterId, courseId });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Chapter deleted successfully',
            data: {}
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while deleting chapter');
    }
};

const syncChapterVideosByAdmin = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const chapter = await Chapter.findOne({ _id: chapterId, courseId });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        try {
            const videos = await buildVideoSnapshots(chapter.playlistId);
            applySyncedVideosToChapter(chapter, videos);
            await chapter.save();
        } catch (error) {
            chapter.syncStatus = 'failed';
            chapter.syncError = error.message || 'Unable to fetch YouTube playlist videos';
            await chapter.save();
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Chapter videos synced successfully',
            data: { chapter: formatChapterData(chapter) }
        });
    } catch (error) {
        return sendError(
            res,
            error.statusCode || 500,
            error.statusCode ? error.message : 'Something went wrong while syncing chapter videos'
        );
    }
};

const getCoursesByUser = async (req, res) => {
    try {
        const userPhone = normalizePhone(req.user?.phone);

        if (!userPhone) {
            return sendError(res, 401, 'Invalid user token');
        }

        const courses = await Course.find({
            isPublished: true,
            $or: [
                { isOpenToAll: true },
                { allowedUserPhones: userPhone },
                { 'accessGrants.phone': userPhone }
            ]
        }).sort({ createdAt: -1 });
        const accessibleCourses = courses.filter((course) => courseUserHasAccess(course, userPhone));
        const courseCounts = await getCourseCounts(accessibleCourses.map((course) => course._id));

        return res.status(200).json({
            success: true,
            message: 'Courses fetched successfully',
            data: {
                courses: accessibleCourses.map((course) => formatCourseData(
                    course,
                    courseCounts.get(course._id.toString()) || {},
                    {
                        includeUserAccess: true,
                        userPhone
                    }
                ))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching courses');
    }
};

const getCourseByUser = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userPhone = normalizePhone(req.user?.phone);

        if (!userPhone) {
            return sendError(res, 401, 'Invalid user token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        const course = await Course.findOne({
            ...courseQuery,
            isPublished: true
        });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        if (!courseUserHasAccess(course, userPhone)) {
            return sendError(res, 403, 'You do not have access to this course');
        }

        const chapters = await Chapter.find({ courseId: course._id }).sort({ order: 1, createdAt: 1 });
        const counts = {
            chapterCount: chapters.length,
            videoCount: chapters.reduce((total, chapter) => total + chapter.videoCount, 0)
        };

        return res.status(200).json({
            success: true,
            message: 'Course fetched successfully',
            data: {
                course: formatCourseData(course, counts, {
                    includeUserAccess: true,
                    userPhone
                }),
                chapters: chapters.map(formatUserChapterData)
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course');
    }
};

const getCourseVideoEmbedByUser = async (req, res) => {
    try {
        const { courseId, chapterId, videoPosition } = req.params;
        const userPhone = normalizePhone(req.user?.phone);

        if (!userPhone) {
            return sendError(res, 401, 'Invalid user token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const parsedVideoPosition = parseNonNegativeInteger(videoPosition);

        if (parsedVideoPosition === null) {
            return sendError(res, 400, 'Invalid video position');
        }

        const course = await Course.findOne({
            ...courseQuery,
            isPublished: true
        });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        if (!courseUserHasAccess(course, userPhone)) {
            return sendError(res, 403, 'You do not have access to this course');
        }

        const chapter = await Chapter.findOne({
            _id: chapterId,
            courseId: course._id
        });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        const video = (chapter.videos || []).find((chapterVideo) => (
            Number(chapterVideo.position) === parsedVideoPosition
        ));

        if (!video) {
            return sendError(res, 404, 'Video not found');
        }

        const embedUrl = buildUserVideoEmbedUrl(video.youtubeVideoId);
        const frameAncestors = getFrameAncestors();

        return res
            .status(200)
            .set({
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': [
                    "default-src 'none'",
                    "base-uri 'none'",
                    "form-action 'none'",
                    "style-src 'unsafe-inline'",
                    'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
                    frameAncestors ? `frame-ancestors 'self' ${frameAncestors}` : "frame-ancestors 'self'"
                ].join('; ')
            })
            .send(buildUserVideoEmbedHtml(embedUrl, video.title));
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while loading video');
    }
};

const getCoursesByFaculty = async (req, res) => {
    try {
        if (!req.faculty?._id) {
            return sendError(res, 401, 'Invalid faculty token');
        }

        const courses = await Course.find({}).sort({ createdAt: -1 });
        const courseCounts = await getCourseCounts(courses.map((course) => course._id));

        return res.status(200).json({
            success: true,
            message: 'Courses fetched successfully',
            data: {
                courses: courses.map((course) => formatCourseData(
                    course,
                    courseCounts.get(course._id.toString()) || {}
                ))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching courses');
    }
};

const getCourseByFaculty = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!req.faculty?._id) {
            return sendError(res, 401, 'Invalid faculty token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        const course = await Course.findOne(courseQuery);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapters = await Chapter.find({ courseId: course._id }).sort({ order: 1, createdAt: 1 });
        const counts = {
            chapterCount: chapters.length,
            videoCount: chapters.reduce((total, chapter) => total + chapter.videoCount, 0)
        };

        return res.status(200).json({
            success: true,
            message: 'Course fetched successfully',
            data: {
                course: formatCourseData(course, counts),
                chapters: chapters.map(formatFacultyChapterData)
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course');
    }
};

const getCourseVideoEmbedByFaculty = async (req, res) => {
    try {
        const { courseId, chapterId, videoPosition } = req.params;

        if (!req.faculty?._id) {
            return sendError(res, 401, 'Invalid faculty token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const parsedVideoPosition = parseNonNegativeInteger(videoPosition);

        if (parsedVideoPosition === null) {
            return sendError(res, 400, 'Invalid video position');
        }

        const course = await Course.findOne(courseQuery);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapter = await Chapter.findOne({
            _id: chapterId,
            courseId: course._id
        });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        const video = (chapter.videos || []).find((chapterVideo) => (
            Number(chapterVideo.position) === parsedVideoPosition
        ));

        if (!video?.youtubeVideoId) {
            return sendError(res, 404, 'Video not found');
        }

        const embedUrl = buildUserVideoEmbedUrl(video.youtubeVideoId);
        const frameAncestors = getFrameAncestors();

        return res
            .status(200)
            .set({
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': [
                    "default-src 'none'",
                    "base-uri 'none'",
                    "form-action 'none'",
                    "style-src 'unsafe-inline'",
                    'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
                    frameAncestors ? `frame-ancestors 'self' ${frameAncestors}` : "frame-ancestors 'self'"
                ].join('; ')
            })
            .send(buildUserVideoEmbedHtml(embedUrl, video.title));
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while loading video');
    }
};

module.exports = {
    getAllCoursesByAdmin,
    createCourseByAdmin,
    getCourseByAdmin,
    updateCourseByAdmin,
    getCourseAccessByAdmin,
    replaceCourseAccessByAdmin,
    addCourseAccessByAdmin,
    removeCourseAccessByAdmin,
    deleteCourseByAdmin,
    getChaptersByAdmin,
    createChapterByAdmin,
    updateChapterByAdmin,
    deleteChapterByAdmin,
    syncChapterVideosByAdmin,
    getCoursesByUser,
    getCourseByUser,
    getCourseVideoEmbedByUser,
    getCoursesByFaculty,
    getCourseByFaculty,
    getCourseVideoEmbedByFaculty,
    normalizePhoneArray,
    courseUserHasAccess,
    parseCourseDurationMonths,
    getCourseDurationDays,
    getCourseAccessWindow,
    parsePlaylistId,
    buildVideoSnapshots
};
